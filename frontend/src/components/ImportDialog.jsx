import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { AlertCircle, Check, FileUp, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { isValidDateOnly, normalizeMonthlyCost, normalizeApplicationName } from '../domain/analytics.js'

const requirements = {
  subscriptions: ['app_name', 'vendor', 'category', 'monthly_cost', 'total_seats', 'assigned_seats', 'renewal_date'],
  licenses: ['app_name', 'employee_email', 'department', 'license_type', 'assigned', 'last_active', 'monthly_cost'],
  activity: ['app_name', 'employee_email', 'last_active'],
}

function validateSubscription(row, rowNumber) {
  const monthlyCost = normalizeMonthlyCost(row.monthly_cost, row.billing_frequency || 'monthly')
  const totalSeats = Number(row.total_seats)
  const assignedSeats = Number(row.assigned_seats)
  const errors = []
  for (const field of ['app_name', 'vendor', 'category', 'renewal_date']) {
    if (!row[field]?.trim()) errors.push(`Row ${rowNumber}: ${field} is required.`)
  }
  if (monthlyCost === null) errors.push(`Row ${rowNumber}: monthly_cost must be a non-negative number.`)
  if (!Number.isInteger(totalSeats) || totalSeats < 1) errors.push(`Row ${rowNumber}: total_seats must be a positive whole number.`)
  if (!Number.isInteger(assignedSeats) || assignedSeats < 0 || assignedSeats > totalSeats) errors.push(`Row ${rowNumber}: assigned_seats must be between zero and total_seats.`)
  if (!isValidDateOnly(row.renewal_date)) errors.push(`Row ${rowNumber}: renewal_date must be a valid date (YYYY-MM-DD).`)
  return {
    errors,
    value: errors.length ? null : {
      id: `${normalizeApplicationName(row.app_name).replaceAll(' ', '-')}-${crypto.randomUUID().slice(0, 8)}`,
      appName: row.app_name.trim(),
      vendor: row.vendor.trim(),
      category: row.category.trim(),
      monthlyCost,
      billingFrequency: row.billing_frequency || 'monthly',
      totalSeats,
      assignedSeats,
      renewalDate: row.renewal_date,
      department: row.department || '',
      owner: row.owner || '',
      status: 'Active',
      description: row.description || '',
    },
  }
}

function validateLicense(row, rowNumber, subscriptions) {
  const errors = []
  for (const field of ['app_name', 'employee_email', 'department', 'license_type']) {
    if (!row[field]?.trim()) errors.push(`Row ${rowNumber}: ${field} is required.`)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.employee_email || '')) errors.push(`Row ${rowNumber}: employee_email is invalid.`)
  if (!['true', 'false', '1', '0', 'yes', 'no'].includes((row.assigned || '').toLowerCase())) errors.push(`Row ${rowNumber}: assigned must be true or false.`)
  const monthlyCost = row.monthly_cost === '' ? null : Number(row.monthly_cost)
  if (monthlyCost !== null && (!Number.isFinite(monthlyCost) || monthlyCost < 0)) errors.push(`Row ${rowNumber}: monthly_cost must be a non-negative number or blank.`)
  if (row.last_active && !isValidDateOnly(row.last_active)) errors.push(`Row ${rowNumber}: last_active must be a valid date or blank.`)
  const subscription = subscriptions.find((item) => normalizeApplicationName(item.appName) === normalizeApplicationName(row.app_name))
  if (!subscription) errors.push(`Row ${rowNumber}: ${row.app_name} is not in the subscription list; import the subscription first.`)
  return {
    errors,
    value: errors.length ? null : {
      id: crypto.randomUUID(),
      subscriptionId: subscription.id,
      appName: subscription.appName,
      employeeName: row.employee_name || '',
      employeeEmail: row.employee_email.trim(),
      department: row.department.trim(),
      licenseType: row.license_type.trim(),
      assigned: ['true', '1', 'yes'].includes(row.assigned.toLowerCase()),
      lastActive: row.last_active || '',
      monthlyCost,
      excludedFromOptimization: false,
      reclaimedAt: null,
    },
  }
}

function validateActivity(row, rowNumber, subscriptions, licenses) {
  const errors = []
  for (const field of ['app_name', 'employee_email', 'last_active']) {
    if (!row[field]?.trim()) errors.push(`Row ${rowNumber}: ${field} is required.`)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.employee_email || '')) errors.push(`Row ${rowNumber}: employee_email is invalid.`)
  if (row.last_active && !isValidDateOnly(row.last_active)) errors.push(`Row ${rowNumber}: last_active must be a valid date (YYYY-MM-DD).`)
  const appName = normalizeApplicationName(row.app_name || '')
  const email = (row.employee_email || '').trim().toLowerCase()
  const subscription = subscriptions.find((item) => normalizeApplicationName(item.appName) === appName)
  const license = licenses.find((item) => normalizeApplicationName(item.appName) === appName && item.employeeEmail.toLowerCase() === email)
  if (!subscription) errors.push(`Row ${rowNumber}: ${row.app_name} is not in the subscription list.`)
  else if (!license) errors.push(`Row ${rowNumber}: no existing license matches this application and employee email.`)
  return {
    errors,
    value: errors.length ? null : {
      licenseId: license.id,
      appName: subscription.appName,
      employeeEmail: email,
      lastActive: row.last_active,
    },
  }
}

function ImportDialog({ type, subscriptions, existingRows, onClose, onImport }) {
  const [file, setFile] = useState(null)
  const [parsedRows, setParsedRows] = useState([])
  const [parseErrors, setParseErrors] = useState([])
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const required = requirements[type]
  const sampleHref = useMemo(() => {
    const headers = required.join(',')
    const example = type === 'subscriptions'
      ? 'Example App,Example Vendor,Productivity,1200,20,16,2026-12-01'
      : type === 'licenses'
        ? 'Example App,person@example.com,Engineering,Standard,true,2026-08-01,60'
        : 'Example App,person@example.com,2026-10-25'
    return `data:text/csv;charset=utf-8,${encodeURIComponent(`${headers}\n${example}\n`)}`
  }, [required, type])

  function parseFile(selectedFile) {
    setFile(selectedFile)
    setParsedRows([])
    setParseErrors([])
    if (!selectedFile) return
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setParseErrors(['Choose a .csv file.'])
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setParseErrors(['Files must be 5 MB or smaller.'])
      return
    }
    setIsParsing(true)
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim().toLowerCase().replaceAll(' ', '_'),
      complete: (result) => {
        const headers = result.meta.fields ?? []
        const missing = required.filter((column) => !headers.includes(column))
        const errors = []
        if (missing.length) errors.push(`Missing required columns: ${missing.join(', ')}.`)
        for (const error of result.errors) errors.push(`CSV row ${error.row + 2}: ${error.message}`)
        if (!result.data.length) errors.push('The CSV file contains no data rows.')
        const duplicateKeys = new Set()
        const rows = result.data.map((row, index) => {
          const resultRow = type === 'subscriptions'
            ? validateSubscription(row, index + 2)
            : type === 'licenses'
              ? validateLicense(row, index + 2, subscriptions)
              : validateActivity(row, index + 2, subscriptions, existingRows)
          const key = type === 'subscriptions'
            ? normalizeApplicationName(row.app_name || '')
            : `${normalizeApplicationName(row.app_name || '')}:${(row.employee_email || '').trim().toLowerCase()}`
          if (duplicateKeys.has(key)) resultRow.errors.push(`Row ${index + 2}: duplicate record in this file.`)
          duplicateKeys.add(key)
          const alreadyExists = type === 'subscriptions'
            ? existingRows.some((item) => normalizeApplicationName(item.appName) === key)
            : type === 'licenses'
              ? existingRows.some((item) => `${normalizeApplicationName(item.appName)}:${item.employeeEmail.toLowerCase()}` === key)
              : false
          if (alreadyExists) resultRow.errors.push(`Row ${index + 2}: this record already exists.`)
          return { row, value: resultRow.value, errors: resultRow.errors, rowNumber: index + 2 }
        })
        if (missing.length) {
          setParsedRows([])
          setParseErrors(errors)
          setIsParsing(false)
          return
        }
        setParsedRows(rows)
        setParseErrors(errors)
        setIsParsing(false)
      },
      error: (error) => {
        setParseErrors([`Could not read the CSV file: ${error.message}`])
        setIsParsing(false)
      },
    })
  }

  const validRows = parsedRows.filter((row) => row.value && row.errors.length === 0)
  const invalidRows = parsedRows.filter((row) => row.errors.length > 0)

  async function importRows() {
    setIsImporting(true)
    try {
      const imported = await onImport(validRows.map((row) => row.value))
      if (imported === false) return
      if (type === 'activity' && imported && typeof imported === 'object') {
        const { matchedCount, updatedCount, unmatchedCount } = imported
        const summary = `Matched ${matchedCount} licenses; updated ${updatedCount} activity dates${unmatchedCount ? `; ${unmatchedCount} rows did not match` : ''}.`
        if (unmatchedCount) toast.error(summary)
        else toast.success(summary)
      } else {
        toast.success(`Imported ${validRows.length} records.`)
      }
      onClose()
    } catch (error) {
      console.error('CSV import failed:', error)
      toast.error(error.message || 'The CSV import could not be completed.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section aria-labelledby="import-title" aria-modal="true" className="modal import-modal" role="dialog">
        <div className="modal-header">
          <div><span className="eyebrow">DATA IMPORT</span><h2 id="import-title">Import {type}</h2><p>Preview and validate your data before it is added.</p></div>
          <button aria-label="Close dialog" className="icon-button" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <a className="template-link" download={`spendwise-${type}-template.csv`} href={sampleHref}>Download sample CSV template</a>
        <label className="file-drop">
          <FileUp size={22} />
          <strong>{file ? file.name : 'Select a CSV file'}</strong>
          <span>CSV only · up to 5 MB</span>
          <input accept=".csv,text/csv" onChange={(event) => parseFile(event.target.files?.[0])} type="file" />
        </label>
        {isParsing && <div className="import-status">Validating rows…</div>}
        {parseErrors.map((error) => <div className="validation-error" key={error}><AlertCircle size={15} />{error}</div>)}
        {parsedRows.length > 0 && (
          <div className="import-preview">
            <div className="preview-summary"><strong>{validRows.length} rows ready to import</strong><span>{invalidRows.length} invalid or duplicate rows</span></div>
            {invalidRows.length > 0 && (
              <div className="row-errors">
                {invalidRows.map((row) => <p key={row.rowNumber}><strong>Row {row.rowNumber}:</strong> {row.errors.join(' ')}</p>)}
              </div>
            )}
            <div className="preview-table-wrap"><table className="preview-table"><thead><tr>{(type === 'activity' ? required : required.slice(0, 5)).map((field) => <th key={field}>{field.replaceAll('_', ' ')}</th>)}<th>Validation</th></tr></thead><tbody>
              {parsedRows.slice(0, 4).map((row) => <tr key={row.rowNumber}><td>{row.row.app_name || '—'}</td>{type === 'activity'
                ? <><td>{row.row.employee_email || '—'}</td><td>{row.row.last_active || '—'}</td></>
                : <><td>{row.row.vendor || row.row.employee_email || '—'}</td><td>{row.row.category || row.row.department || '—'}</td><td>{row.row.monthly_cost || '—'}</td></>}<td>{row.errors.length ? 'Needs review' : 'Valid'}</td></tr>)}
            </tbody></table></div>
          </div>
        )}
        <div className="modal-actions"><button className="secondary-button" disabled={isImporting} onClick={onClose} type="button">Cancel</button><button className="primary-button" disabled={!validRows.length || isParsing || isImporting} onClick={importRows} type="button"><Check size={15} />{isImporting ? 'Importing…' : `Import ${validRows.length} valid rows`}</button></div>
      </section>
    </div>
  )
}

export default ImportDialog
