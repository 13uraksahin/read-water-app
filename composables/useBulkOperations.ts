// =============================================================================
// Bulk Operations Composable - Export/Import Utilities
// =============================================================================

export type ExportScope = 'page' | 'all'
export type ExportFormat = 'csv' | 'xlsx'

export interface ExportColumn {
  key: string
  label: string
  children?: ExportColumn[]
}

export interface ExportOptions {
  scope: ExportScope
  format?: ExportFormat
  filters?: Record<string, string | number | boolean | undefined>
  pageData?: unknown[]  // Current page data for 'page' scope
  selectedColumns?: string[]  // Column keys to include in export
}

export interface ImportResult {
  success: boolean
  totalRows: number
  importedRows: number
  failedRows: number
  errors: Array<{ row: number; field: string; message: string }>
}

export interface BulkImportOptions {
  file: File
  namePrefix?: string
  nameSuffix?: string
  profileId?: string
}

export const useBulkOperations = () => {
  const api = useApi()
  const toast = useToast()
  
  const MAX_EXPORT_ROWS = 10000
  
  // ==========================================================================
  // EXPORT FUNCTIONS
  // ==========================================================================
  
  /**
   * Export data to CSV format with optional column filtering
   */
  const exportToCSV = (data: Record<string, unknown>[], filename: string, selectedColumns?: string[]) => {
    if (!data.length) {
      toast.error('No data to export')
      return
    }
    
    // Flatten all data first
    const flattenedData = data.map(row => flattenObject(row))
    
    // Get all available headers from first row
    const allHeaders = Object.keys(flattenedData[0])
    
    // Filter headers based on selected columns
    let headers: string[]
    if (selectedColumns && selectedColumns.length > 0) {
      // Keep only selected columns that exist in the data
      headers = selectedColumns.filter(col => allHeaders.includes(col))
      // If no matching columns found, use all
      if (headers.length === 0) {
        headers = allHeaders
      }
    } else {
      headers = allHeaders
    }
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...flattenedData.map(row => {
        return headers.map(h => {
          const value = row[h]
          // Escape quotes and wrap in quotes if contains comma
          if (value === null || value === undefined) return ''
          const strValue = String(value)
          if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`
          }
          return strValue
        }).join(',')
      })
    ].join('\n')
    
    // Download file
    downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;')
  }
  
  /**
   * Flatten nested object for CSV export
   */
  const flattenObject = (obj: unknown, prefix = ''): Record<string, string | number | boolean | null> => {
    const result: Record<string, string | number | boolean | null> = {}
    
    if (obj === null || obj === undefined) return result
    if (typeof obj !== 'object') return { [prefix]: obj as string | number | boolean }
    
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      
      if (value === null || value === undefined) {
        result[newKey] = null
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, flattenObject(value, newKey))
      } else if (Array.isArray(value)) {
        result[newKey] = value.length > 0 ? JSON.stringify(value) : ''
      } else {
        result[newKey] = value as string | number | boolean
      }
    }
    
    return result
  }
  
  /**
   * Download file utility
   */
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
  
  /**
   * Export meters
   */
  const exportMeters = async (options: ExportOptions) => {
    try {
      if (options.scope === 'page' && options.pageData) {
        exportToCSV(options.pageData as Record<string, unknown>[], `meters_export_${Date.now()}`, options.selectedColumns)
        toast.success('Page data exported successfully')
        return
      }
      
      // Fetch all data with filters (limited to MAX_EXPORT_ROWS)
      const response = await api.getList<Record<string, unknown>>('/api/v1/meters/export', {
        ...options.filters,
        limit: MAX_EXPORT_ROWS,
      })
      
      exportToCSV(response.data, `meters_export_${Date.now()}`, options.selectedColumns)
      toast.success(`Exported ${response.data.length} meters`)
    } catch (error) {
      toast.error('Failed to export meters')
      console.error('Export error:', error)
    }
  }
  
  /**
   * Export modules
   */
  const exportModules = async (options: ExportOptions) => {
    try {
      if (options.scope === 'page' && options.pageData) {
        exportToCSV(options.pageData as Record<string, unknown>[], `modules_export_${Date.now()}`, options.selectedColumns)
        toast.success('Page data exported successfully')
        return
      }
      
      const response = await api.getList<Record<string, unknown>>('/api/v1/modules/export', {
        ...options.filters,
        limit: MAX_EXPORT_ROWS,
      })
      
      exportToCSV(response.data, `modules_export_${Date.now()}`, options.selectedColumns)
      toast.success(`Exported ${response.data.length} modules`)
    } catch (error) {
      toast.error('Failed to export modules')
      console.error('Export error:', error)
    }
  }
  
  /**
   * Export customers
   */
  const exportCustomers = async (options: ExportOptions) => {
    try {
      if (options.scope === 'page' && options.pageData) {
        exportToCSV(options.pageData as Record<string, unknown>[], `customers_export_${Date.now()}`, options.selectedColumns)
        toast.success('Page data exported successfully')
        return
      }
      
      const response = await api.getList<Record<string, unknown>>('/api/v1/customers/export', {
        ...options.filters,
        limit: MAX_EXPORT_ROWS,
      })
      
      exportToCSV(response.data, `customers_export_${Date.now()}`, options.selectedColumns)
      toast.success(`Exported ${response.data.length} customers`)
    } catch (error) {
      toast.error('Failed to export customers')
      console.error('Export error:', error)
    }
  }
  
  /**
   * Export subscriptions
   */
  const exportSubscriptions = async (options: ExportOptions) => {
    try {
      if (options.scope === 'page' && options.pageData) {
        exportToCSV(options.pageData as Record<string, unknown>[], `subscriptions_export_${Date.now()}`, options.selectedColumns)
        toast.success('Page data exported successfully')
        return
      }
      
      const response = await api.getList<Record<string, unknown>>('/api/v1/subscriptions/export', {
        ...options.filters,
        limit: MAX_EXPORT_ROWS,
      })
      
      exportToCSV(response.data, `subscriptions_export_${Date.now()}`, options.selectedColumns)
      toast.success(`Exported ${response.data.length} subscriptions`)
    } catch (error) {
      toast.error('Failed to export subscriptions')
      console.error('Export error:', error)
    }
  }
  
  // ==========================================================================
  // IMPORT FUNCTIONS
  // ==========================================================================
  
  /**
   * Parse CSV file
   */
  const parseCSV = async (file: File): Promise<Record<string, string>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          const lines = content.split(/\r?\n/).filter(line => line.trim())
          
          if (lines.length < 2) {
            reject(new Error('CSV file must have at least a header row and one data row'))
            return
          }
          
          const headers = parseCSVLine(lines[0])
          const data: Record<string, string>[] = []
          
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i])
            const row: Record<string, string> = {}
            
            headers.forEach((header, index) => {
              row[header] = values[index] || ''
            })
            
            data.push(row)
          }
          
          resolve(data)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }
  
  /**
   * Parse a single CSV line handling quoted values
   */
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }
  
  /**
   * Import meters from CSV
   */
  const importMeters = async (options: BulkImportOptions): Promise<ImportResult> => {
    try {
      const rows = await parseCSV(options.file)
      
      const formData = new FormData()
      formData.append('file', options.file)
      if (options.namePrefix) formData.append('namePrefix', options.namePrefix)
      if (options.nameSuffix) formData.append('nameSuffix', options.nameSuffix)
      if (options.profileId) formData.append('meterProfileId', options.profileId)
      
      const response = await api.post<ImportResult>('/api/v1/meters/bulk-import', {
        rows,
        namePrefix: options.namePrefix,
        nameSuffix: options.nameSuffix,
        meterProfileId: options.profileId,
      })
      
      return response as unknown as ImportResult
    } catch (error) {
      toast.error('Failed to import meters')
      throw error
    }
  }
  
  /**
   * Import modules from CSV
   */
  const importModules = async (options: BulkImportOptions): Promise<ImportResult> => {
    try {
      const rows = await parseCSV(options.file)
      
      const response = await api.post<ImportResult>('/api/v1/modules/bulk-import', {
        rows,
        namePrefix: options.namePrefix,
        nameSuffix: options.nameSuffix,
        moduleProfileId: options.profileId,
      })
      
      return response as unknown as ImportResult
    } catch (error) {
      toast.error('Failed to import modules')
      throw error
    }
  }
  
  /**
   * Import customers from CSV
   */
  const importCustomers = async (options: BulkImportOptions): Promise<ImportResult> => {
    try {
      const rows = await parseCSV(options.file)
      
      const response = await api.post<ImportResult>('/api/v1/customers/bulk-import', {
        rows,
      })
      
      return response as unknown as ImportResult
    } catch (error) {
      toast.error('Failed to import customers')
      throw error
    }
  }
  
  /**
   * Import subscriptions from CSV
   */
  const importSubscriptions = async (options: BulkImportOptions): Promise<ImportResult> => {
    try {
      const rows = await parseCSV(options.file)
      
      const response = await api.post<ImportResult>('/api/v1/subscriptions/bulk-import', {
        rows,
      })
      
      return response as unknown as ImportResult
    } catch (error) {
      toast.error('Failed to import subscriptions')
      throw error
    }
  }
  
  // ==========================================================================
  // SAMPLE FILE GENERATORS
  // ==========================================================================
  
  /**
   * Download sample import file for meters
   */
  const downloadMetersSample = () => {
    const sample = 'serialNumber,initialIndex,installationDate,status\nMTR-001,0,2024-01-01,WAREHOUSE\nMTR-002,100,2024-01-15,WAREHOUSE'
    downloadFile(sample, 'meters_import_sample.csv', 'text/csv;charset=utf-8;')
  }
  
  /**
   * Download sample import file for modules
   */
  const downloadModulesSample = () => {
    const sample = 'serialNumber,DevEUI,JoinEUI,AppKey,status\nMOD-001,0011223344556677,1122334455667788,00112233445566778899AABBCCDDEEFF,WAREHOUSE'
    downloadFile(sample, 'modules_import_sample.csv', 'text/csv;charset=utf-8;')
  }
  
  /**
   * Download sample import file for customers
   */
  const downloadCustomersSample = () => {
    const sample = 'customerNumber,customerType,firstName,lastName,tcIdNo,phone,email,organizationName,taxId\nCUST-001,INDIVIDUAL,John,Doe,12345678901,+905551234567,john@example.com,,\nCUST-002,ORGANIZATIONAL,,,,,contact@company.com,Company Inc,1234567890'
    downloadFile(sample, 'customers_import_sample.csv', 'text/csv;charset=utf-8;')
  }
  
  /**
   * Download sample import file for subscriptions
   */
  const downloadSubscriptionsSample = () => {
    const sample = 'subscriptionNumber,customerNumber,subscriptionGroup,city,district,neighborhood,street,buildingNo,latitude,longitude\nSUB-001,CUST-001,NORMAL_CONSUMPTION,Istanbul,Kadikoy,Moda,Main Street,10,40.9876,29.0244'
    downloadFile(sample, 'subscriptions_import_sample.csv', 'text/csv;charset=utf-8;')
  }
  
  // ==========================================================================
  // COLUMN DEFINITIONS
  // ==========================================================================
  
  const metersColumns: ExportColumn[] = [
    {
      key: '_basic',
      label: 'Basic Information',
      children: [
        { key: 'id', label: 'ID' },
        { key: 'serialNumber', label: 'Serial Number' },
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status' },
        { key: 'initialIndex', label: 'Initial Index' },
        { key: 'currentIndex', label: 'Current Index' },
        { key: 'lastReadingDate', label: 'Last Reading Date' },
        { key: 'installationDate', label: 'Installation Date' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'updatedAt', label: 'Updated At' },
      ]
    },
    {
      key: '_profile',
      label: 'Meter Profile',
      children: [
        { key: 'profile.id', label: 'Profile ID' },
        { key: 'profile.brand', label: 'Brand' },
        { key: 'profile.modelCode', label: 'Model Code' },
        { key: 'profile.diameter', label: 'Diameter' },
        { key: 'profile.measurementClass', label: 'Measurement Class' },
      ]
    },
    {
      key: '_subscription',
      label: 'Subscription',
      children: [
        { key: 'subscription.id', label: 'Subscription ID' },
        { key: 'subscription.subscriptionNumber', label: 'Subscription Number' },
        { key: 'subscription.subscriptionGroup', label: 'Subscription Group' },
      ]
    },
    {
      key: '_module',
      label: 'Linked Module',
      children: [
        { key: 'linkedModule.id', label: 'Module ID' },
        { key: 'linkedModule.serialNumber', label: 'Module Serial' },
        { key: 'linkedModule.status', label: 'Module Status' },
      ]
    },
    {
      key: '_tenant',
      label: 'Tenant',
      children: [
        { key: 'tenantId', label: 'Tenant ID' },
        { key: 'tenant.name', label: 'Tenant Name' },
      ]
    },
  ]
  
  const modulesColumns: ExportColumn[] = [
    {
      key: '_basic',
      label: 'Basic Information',
      children: [
        { key: 'id', label: 'ID' },
        { key: 'serialNumber', label: 'Serial Number' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'updatedAt', label: 'Updated At' },
      ]
    },
    {
      key: '_profile',
      label: 'Module Profile',
      children: [
        { key: 'profile.id', label: 'Profile ID' },
        { key: 'profile.brand', label: 'Brand' },
        { key: 'profile.modelCode', label: 'Model Code' },
        { key: 'profile.communicationTechnology', label: 'Communication Technology' },
      ]
    },
    {
      key: '_dynamicFields',
      label: 'Dynamic Fields',
      children: [
        { key: 'dynamicFields.DevEUI', label: 'DevEUI' },
        { key: 'dynamicFields.JoinEUI', label: 'JoinEUI' },
        { key: 'dynamicFields.AppKey', label: 'AppKey' },
        { key: 'dynamicFields.IMEI', label: 'IMEI' },
        { key: 'dynamicFields.ICCID', label: 'ICCID' },
      ]
    },
    {
      key: '_tenant',
      label: 'Tenant',
      children: [
        { key: 'tenantId', label: 'Tenant ID' },
        { key: 'tenant.name', label: 'Tenant Name' },
      ]
    },
  ]
  
  const customersColumns: ExportColumn[] = [
    {
      key: '_basic',
      label: 'Basic Information',
      children: [
        { key: 'id', label: 'ID' },
        { key: 'customerNumber', label: 'Customer Number' },
        { key: 'customerType', label: 'Customer Type' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'updatedAt', label: 'Updated At' },
      ]
    },
    {
      key: '_individual',
      label: 'Individual Details',
      children: [
        { key: 'details.firstName', label: 'First Name' },
        { key: 'details.lastName', label: 'Last Name' },
        { key: 'details.tcIdNo', label: 'TC ID No' },
        { key: 'details.phone', label: 'Phone' },
        { key: 'details.email', label: 'Email' },
      ]
    },
    {
      key: '_organizational',
      label: 'Organization Details',
      children: [
        { key: 'details.organizationName', label: 'Organization Name' },
        { key: 'details.taxId', label: 'Tax ID' },
        { key: 'details.taxOffice', label: 'Tax Office' },
        { key: 'details.contactFirstName', label: 'Contact First Name' },
        { key: 'details.contactLastName', label: 'Contact Last Name' },
        { key: 'details.contactPhone', label: 'Contact Phone' },
        { key: 'details.contactEmail', label: 'Contact Email' },
      ]
    },
    {
      key: '_tenant',
      label: 'Tenant',
      children: [
        { key: 'tenantId', label: 'Tenant ID' },
        { key: 'tenant.name', label: 'Tenant Name' },
      ]
    },
  ]
  
  const subscriptionsColumns: ExportColumn[] = [
    {
      key: '_basic',
      label: 'Basic Information',
      children: [
        { key: 'id', label: 'ID' },
        { key: 'subscriptionNumber', label: 'Subscription Number' },
        { key: 'subscriptionGroup', label: 'Subscription Group' },
        { key: 'latitude', label: 'Latitude' },
        { key: 'longitude', label: 'Longitude' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'updatedAt', label: 'Updated At' },
      ]
    },
    {
      key: '_address',
      label: 'Address',
      children: [
        { key: 'address.city', label: 'City' },
        { key: 'address.district', label: 'District' },
        { key: 'address.neighborhood', label: 'Neighborhood' },
        { key: 'address.street', label: 'Street' },
        { key: 'address.buildingNo', label: 'Building No' },
        { key: 'address.floor', label: 'Floor' },
        { key: 'address.doorNo', label: 'Door No' },
        { key: 'address.postalCode', label: 'Postal Code' },
        { key: 'address.addressCode', label: 'Address Code' },
      ]
    },
    {
      key: '_customer',
      label: 'Customer',
      children: [
        { key: 'customer.id', label: 'Customer ID' },
        { key: 'customer.customerNumber', label: 'Customer Number' },
        { key: 'customer.customerType', label: 'Customer Type' },
      ]
    },
    {
      key: '_tenant',
      label: 'Tenant',
      children: [
        { key: 'tenantId', label: 'Tenant ID' },
        { key: 'tenant.name', label: 'Tenant Name' },
      ]
    },
  ]
  
  return {
    // Export
    exportToCSV,
    exportMeters,
    exportModules,
    exportCustomers,
    exportSubscriptions,
    
    // Import
    parseCSV,
    importMeters,
    importModules,
    importCustomers,
    importSubscriptions,
    
    // Sample files
    downloadMetersSample,
    downloadModulesSample,
    downloadCustomersSample,
    downloadSubscriptionsSample,
    
    // Column definitions
    metersColumns,
    modulesColumns,
    customersColumns,
    subscriptionsColumns,
    
    // Constants
    MAX_EXPORT_ROWS,
  }
}
