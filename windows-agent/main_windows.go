//go:build windows

package main

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

const (
	pollInterval  = 5 * time.Second
	flushInterval = time.Minute
	idleLimit     = 60 * time.Second
)

var errDeviceUnauthorized = errors.New("monitoring device was revoked or is no longer authorized")

var (
	user32                     = syscall.NewLazyDLL("user32.dll")
	kernel32                   = syscall.NewLazyDLL("kernel32.dll")
	getForegroundWindow        = user32.NewProc("GetForegroundWindow")
	getWindowThreadProcessID   = user32.NewProc("GetWindowThreadProcessId")
	getLastInputInfo           = user32.NewProc("GetLastInputInfo")
	getTickCount64             = kernel32.NewProc("GetTickCount64")
	openProcess                = kernel32.NewProc("OpenProcess")
	queryFullProcessImageNameW = kernel32.NewProc("QueryFullProcessImageNameW")
	closeHandle                = kernel32.NewProc("CloseHandle")
	localFree                  = kernel32.NewProc("LocalFree")
	crypt32                    = syscall.NewLazyDLL("crypt32.dll")
	cryptProtectData           = crypt32.NewProc("CryptProtectData")
	cryptUnprotectData         = crypt32.NewProc("CryptUnprotectData")
)

type agentConfig struct {
	APIBaseURL           string `json:"apiBaseUrl"`
	DeviceID             string `json:"deviceId"`
	DeviceToken          string `json:"-"`
	ProtectedDeviceToken string `json:"deviceTokenProtected"`
}

type enrollmentResponse struct {
	Data struct {
		DeviceID    string `json:"deviceId"`
		DeviceToken string `json:"deviceToken"`
	} `json:"data"`
}

type activityRecord struct {
	AppID         string `json:"appId"`
	ActivityDate  string `json:"activityDate"`
	ActiveSeconds int    `json:"activeSeconds"`
}

type activityBatch struct {
	BatchID string           `json:"batchId"`
	Records []activityRecord `json:"records"`
}

type lastInputInfo struct {
	Size uint32
	Time uint32
}

type dataBlob struct {
	Size uint32
	Data *byte
}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--uninstall" {
		if err := uninstall(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		fmt.Println("SpendWise startup entry removed. Ask your organization admin to revoke this device.")
		return
	}

	if len(os.Args) <= 1 || os.Args[1] == "--install" {
		if err := install(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
	}

	config, err := readConfig()
	if err != nil {
		fmt.Fprintln(os.Stderr, "Agent is not enrolled. Run SpendWiseAgent.exe --install.")
		os.Exit(1)
	}
	fmt.Println("SpendWise usage agent is running visibly for this signed-in Windows account.")
	fmt.Println("It records foreground application process names and active time only.")
	fmt.Println("Window titles, screen contents, keystrokes, passwords, and browser page contents are not collected.")
	fmt.Println("Press Ctrl+C to stop. Contact your organization admin to pause or revoke this device.")
	if err := run(config); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func install() error {
	reader := bufio.NewReader(os.Stdin)
	fmt.Println("SpendWise Usage Agent notice")
	fmt.Println("This organization-managed agent records foreground Windows app process names and active time.")
	fmt.Println("It does not collect window titles, browser page contents, passwords, keystrokes, or screenshots.")
	fmt.Println("Collected app usage is sent over HTTPS and visible to organization administrators.")
	consent, err := readLine(reader, `Type "I AGREE" after reading your organization's monitoring notice: `)
	if err != nil {
		return err
	}
	if consent != "I AGREE" {
		return errors.New("installation cancelled; employee acknowledgment is required")
	}
	apiBaseURL, err := readLine(reader, "SpendWise API base URL (include /api/v1): ")
	if err != nil {
		return err
	}
	apiBaseURL = strings.TrimRight(strings.TrimSpace(apiBaseURL), "/")
	if err := validateAPIBaseURL(apiBaseURL); err != nil {
		return err
	}
	code, err := readLine(reader, "One-time enrollment code from your organization admin: ")
	if err != nil {
		return err
	}
	if strings.TrimSpace(code) == "" {
		return errors.New("enrollment code cannot be empty")
	}

	config, err := enroll(apiBaseURL, strings.TrimSpace(code))
	if err != nil {
		return err
	}
	if err := writeConfig(config); err != nil {
		return err
	}
	if err := installExecutable(); err != nil {
		return err
	}
	if err := installStartupEntry(); err != nil {
		return err
	}
	fmt.Println("Device enrollment complete. The agent will start at each sign-in and remains visible while running.")
	return nil
}

func installedExecutablePath() (string, error) {
	root := os.Getenv("LOCALAPPDATA")
	if root == "" {
		return "", errors.New("Windows LOCALAPPDATA directory is unavailable")
	}
	dir := filepath.Join(root, "Programs", "SpendWise")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return filepath.Join(dir, "SpendWiseAgent.exe"), nil
}

func installExecutable() error {
	source, err := os.Executable()
	if err != nil {
		return err
	}
	target, err := installedExecutablePath()
	if err != nil {
		return err
	}
	if strings.EqualFold(filepath.Clean(source), filepath.Clean(target)) {
		return nil
	}
	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()
	output, err := os.Create(target)
	if err != nil {
		return err
	}
	if _, err := io.Copy(output, input); err != nil {
		output.Close()
		return err
	}
	if err := output.Close(); err != nil {
		return err
	}
	return nil
}

func readLine(reader *bufio.Reader, prompt string) (string, error) {
	fmt.Print(prompt)
	value, err := reader.ReadString('\n')
	if err != nil && err != io.EOF {
		return "", err
	}
	return strings.TrimSpace(value), nil
}

func validateAPIBaseURL(value string) error {
	parsed, err := url.ParseRequestURI(value)
	if err != nil || parsed.Host == "" || !strings.HasSuffix(parsed.Path, "/api/v1") {
		return errors.New("enter a valid API URL ending in /api/v1")
	}
	if parsed.Scheme != "https" && parsed.Hostname() != "localhost" && parsed.Hostname() != "127.0.0.1" {
		return errors.New("monitoring data requires HTTPS except for localhost development")
	}
	return nil
}

func enroll(apiBaseURL, code string) (agentConfig, error) {
	body, err := json.Marshal(map[string]string{"code": code})
	if err != nil {
		return agentConfig{}, fmt.Errorf("could not prepare enrollment request: %w", err)
	}
	request, err := http.NewRequest(http.MethodPost, apiBaseURL+"/monitoring/enroll", bytes.NewReader(body))
	if err != nil {
		return agentConfig{}, fmt.Errorf("could not prepare enrollment request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 15 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return agentConfig{}, fmt.Errorf("could not reach the SpendWise API: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusCreated {
		return agentConfig{}, fmt.Errorf("device enrollment failed (HTTP %d); ask the admin to issue a fresh code", response.StatusCode)
	}
	var result enrollmentResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return agentConfig{}, fmt.Errorf("could not read enrollment response: %w", err)
	}
	if result.Data.DeviceID == "" || result.Data.DeviceToken == "" {
		return agentConfig{}, errors.New("the API returned an incomplete device enrollment")
	}
	return agentConfig{APIBaseURL: apiBaseURL, DeviceID: result.Data.DeviceID, DeviceToken: result.Data.DeviceToken}, nil
}

func configPath() (string, error) {
	root := os.Getenv("APPDATA")
	if root == "" {
		return "", errors.New("Windows APPDATA directory is unavailable")
	}
	dir := filepath.Join(root, "SpendWise")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return filepath.Join(dir, "agent.json"), nil
}

func writeConfig(config agentConfig) error {
	path, err := configPath()
	if err != nil {
		return err
	}
	token := config.DeviceToken
	config.DeviceToken = ""
	protected, err := protect([]byte(token))
	if err != nil {
		return err
	}
	config.ProtectedDeviceToken = base64.StdEncoding.EncodeToString(protected)
	encoded, err := json.Marshal(config)
	if err != nil {
		return err
	}
	return os.WriteFile(path, encoded, 0600)
}

func readConfig() (agentConfig, error) {
	path, err := configPath()
	if err != nil {
		return agentConfig{}, err
	}
	encoded, err := os.ReadFile(path)
	if err != nil {
		return agentConfig{}, err
	}
	var config agentConfig
	if err := json.Unmarshal(encoded, &config); err != nil {
		return agentConfig{}, err
	}
	protected, err := base64.StdEncoding.DecodeString(config.ProtectedDeviceToken)
	if err != nil {
		return agentConfig{}, errors.New("device credential is not valid")
	}
	token, err := unprotect(protected)
	if err != nil {
		return agentConfig{}, errors.New("device credential could not be decrypted for this Windows account")
	}
	config.DeviceToken = string(token)
	if err := validateAPIBaseURL(config.APIBaseURL); err != nil {
		return agentConfig{}, err
	}
	if config.DeviceID == "" || config.DeviceToken == "" {
		return agentConfig{}, errors.New("agent configuration is incomplete")
	}
	return config, nil
}

func installStartupEntry() error {
	executable, err := installedExecutablePath()
	if err != nil {
		return err
	}
	command := fmt.Sprintf(`"%s" --run`, executable)
	return exec.Command("reg.exe", "add",
		`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`,
		"/v", "SpendWiseUsageAgent",
		"/t", "REG_SZ",
		"/d", command,
		"/f",
	).Run()
}

func uninstall() error {
	if err := exec.Command("reg.exe", "delete",
		`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`,
		"/v", "SpendWiseUsageAgent", "/f",
	).Run(); err != nil {
		return fmt.Errorf("could not remove the startup entry: %w", err)
	}
	path, err := configPath()
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func run(config agentConfig) error {
	client := &http.Client{Timeout: 15 * time.Second}
	pending := make(map[string]int)
	var retry *activityBatch
	poll := time.NewTicker(pollInterval)
	flush := time.NewTicker(flushInterval)
	defer poll.Stop()
	defer flush.Stop()

	for {
		select {
		case <-poll.C:
			if appID := foregroundAppID(); appID != "" && appID != "spendwiseagent.exe" && !isIdle() {
				key := time.Now().UTC().Format("2006-01-02") + "|" + appID
				pending[key] += int(pollInterval.Seconds())
			}
		case <-flush.C:
			if retry == nil && len(pending) > 0 {
				batchID, err := newUUID()
				if err != nil {
					fmt.Fprintln(os.Stderr, "Could not create activity batch:", err)
					continue
				}
				retry = &activityBatch{BatchID: batchID}
				keys := make([]string, 0, len(pending))
				for key := range pending {
					keys = append(keys, key)
				}
				sort.Strings(keys)
				if len(keys) > 250 {
					keys = keys[:250]
				}
				for _, key := range keys {
					seconds := pending[key]
					date, appID, _ := strings.Cut(key, "|")
					retry.Records = append(retry.Records, activityRecord{
						AppID: appID, ActivityDate: date, ActiveSeconds: seconds,
					})
				}
			}
			if retry != nil {
				if err := upload(client, config, *retry); err != nil {
					if errors.Is(err, errDeviceUnauthorized) {
						return err
					}
					fmt.Fprintln(os.Stderr, "Usage sync delayed; will retry:", err)
					continue
				}
				for _, record := range retry.Records {
					key := record.ActivityDate + "|" + record.AppID
					pending[key] -= record.ActiveSeconds
					if pending[key] <= 0 {
						delete(pending, key)
					}
				}
				retry = nil
			}
		}
	}
}

func upload(client *http.Client, config agentConfig, batch activityBatch) error {
	body, err := json.Marshal(batch)
	if err != nil {
		return err
	}
	request, err := http.NewRequest(http.MethodPost, config.APIBaseURL+"/monitoring/activity", bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+config.DeviceToken)
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusUnauthorized || response.StatusCode == http.StatusForbidden {
		return errDeviceUnauthorized
	}
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("API returned HTTP %d", response.StatusCode)
	}
	return nil
}

func foregroundAppID() string {
	window, _, _ := getForegroundWindow.Call()
	if window == 0 {
		return ""
	}
	var processID uint32
	getWindowThreadProcessID.Call(window, uintptr(unsafe.Pointer(&processID)))
	if processID == 0 {
		return ""
	}
	handle, _, _ := openProcess.Call(0x1000, 0, uintptr(processID))
	if handle == 0 {
		return ""
	}
	defer closeHandle.Call(handle)

	buffer := make([]uint16, 1024)
	size := uint32(len(buffer))
	ok, _, _ := queryFullProcessImageNameW.Call(
		handle, 0, uintptr(unsafe.Pointer(&buffer[0])), uintptr(unsafe.Pointer(&size)),
	)
	if ok == 0 {
		return ""
	}
	name := strings.ToLower(filepath.Base(syscall.UTF16ToString(buffer[:size])))
	var safeName strings.Builder
	for _, character := range name {
		if (character >= 'a' && character <= 'z') ||
			(character >= '0' && character <= '9') ||
			strings.ContainsRune("._ -", character) {
			safeName.WriteRune(character)
		} else {
			safeName.WriteByte('_')
		}
	}
	appID := strings.Trim(safeName.String(), " ._")
	if len(appID) == 0 || len(appID) > 120 {
		return ""
	}
	return appID
}

func isIdle() bool {
	info := lastInputInfo{Size: uint32(unsafe.Sizeof(lastInputInfo{}))}
	ok, _, _ := getLastInputInfo.Call(uintptr(unsafe.Pointer(&info)))
	if ok == 0 {
		return true
	}
	ticks, _, _ := getTickCount64.Call()
	idleMilliseconds := uint32(ticks) - info.Time
	return time.Duration(idleMilliseconds)*time.Millisecond >= idleLimit
}

func newUUID() (string, error) {
	var value [16]byte
	if _, err := rand.Read(value[:]); err != nil {
		return "", err
	}
	value[6] = value[6]&0x0f | 0x40
	value[8] = value[8]&0x3f | 0x80
	encoded := hex.EncodeToString(value[:])
	return encoded[:8] + "-" + encoded[8:12] + "-" + encoded[12:16] + "-" + encoded[16:20] + "-" + encoded[20:], nil
}

func protect(value []byte) ([]byte, error) {
	input := dataBlob{Size: uint32(len(value)), Data: &value[0]}
	var output dataBlob
	ok, _, callErr := cryptProtectData.Call(
		uintptr(unsafe.Pointer(&input)), 0, 0, 0, 0, 1, uintptr(unsafe.Pointer(&output)),
	)
	if ok == 0 {
		return nil, callErr
	}
	defer localFree.Call(uintptr(unsafe.Pointer(output.Data)))
	return append([]byte(nil), unsafe.Slice(output.Data, output.Size)...), nil
}

func unprotect(value []byte) ([]byte, error) {
	if len(value) == 0 {
		return nil, errors.New("protected credential is empty")
	}
	input := dataBlob{Size: uint32(len(value)), Data: &value[0]}
	var output dataBlob
	ok, _, callErr := cryptUnprotectData.Call(
		uintptr(unsafe.Pointer(&input)), 0, 0, 0, 0, 1, uintptr(unsafe.Pointer(&output)),
	)
	if ok == 0 {
		return nil, callErr
	}
	defer localFree.Call(uintptr(unsafe.Pointer(output.Data)))
	return append([]byte(nil), unsafe.Slice(output.Data, output.Size)...), nil
}
