// =============================================================================
// TypeScript Type Definitions - Read Water Frontend
// =============================================================================
// Updated for Subscription Model Architecture
// Tenant → Customer → Subscription → Meter → Device
// =============================================================================

// =============================================================================
// Enums (matching backend)
// =============================================================================

export enum SystemRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
  FIELD_ENGINEER = 'FIELD_ENGINEER',
  CUSTOMER = 'CUSTOMER',
}

export enum MeterStatus {
  ACTIVE = 'ACTIVE',
  PASSIVE = 'PASSIVE',
  WAREHOUSE = 'WAREHOUSE',
  MAINTENANCE = 'MAINTENANCE',
  PLANNED = 'PLANNED',
  DEPLOYED = 'DEPLOYED',
  USED = 'USED',
}

export enum DeviceStatus {
  ACTIVE = 'ACTIVE',
  PASSIVE = 'PASSIVE',
  WAREHOUSE = 'WAREHOUSE',
  MAINTENANCE = 'MAINTENANCE',
  PLANNED = 'PLANNED',
  DEPLOYED = 'DEPLOYED',
  USED = 'USED',
}

export enum ValveStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  UNKNOWN = 'UNKNOWN',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  ORGANIZATIONAL = 'ORGANIZATIONAL',
}

export enum ConsumptionType {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
}

export enum SubscriptionType {
  INDIVIDUAL = 'INDIVIDUAL',
  ORGANIZATIONAL = 'ORGANIZATIONAL',
}

export enum SubscriptionGroup {
  NORMAL_CONSUMPTION = 'NORMAL_CONSUMPTION',
  HIGH_CONSUMPTION = 'HIGH_CONSUMPTION',
}

export enum CommunicationTechnology {
  SIGFOX = 'SIGFOX',
  LORAWAN = 'LORAWAN',
  NB_IOT = 'NB_IOT',
  WM_BUS = 'WM_BUS',
  MIOTY = 'MIOTY',
  WIFI = 'WIFI',
  BLUETOOTH = 'BLUETOOTH',
  NFC = 'NFC',
  OMS = 'OMS',
}

export enum IntegrationType {
  HTTP = 'HTTP',
  MQTT = 'MQTT',
  API = 'API',
}

export enum CommunicationModule {
  INTEGRATED = 'INTEGRATED',
  RETROFIT = 'RETROFIT',
  NONE = 'NONE',
}

// Meter Brands
export enum Brand {
  BAYLAN = 'BAYLAN',
  MANAS = 'MANAS',
  KLEPSAN = 'KLEPSAN',
  CEM = 'CEM',
  ZENNER = 'ZENNER',
  TURKOGLU = 'TURKOGLU',
  BEREKET = 'BEREKET',
  TEKSAN = 'TEKSAN',
  ITRON = 'ITRON',
  IMA = 'IMA',
}

// Device Brands
export enum DeviceBrand {
  UNA = 'UNA',
  IMA = 'IMA',
  ITRON = 'ITRON',
  ZENNER = 'ZENNER',
  MANAS = 'MANAS',
  BAYLAN = 'BAYLAN',
  CEM = 'CEM',
  KLEPSAN = 'KLEPSAN',
  INODYA = 'INODYA',
}

export enum MeterType {
  SINGLE_JET = 'SINGLE_JET',
  MULTI_JET = 'MULTI_JET',
  WOLTMAN_PARALEL = 'WOLTMAN_PARALEL',
  WOLTMAN_VERTICAL = 'WOLTMAN_VERTICAL',
  VOLUMETRIC = 'VOLUMETRIC',
  ULTRASONIC = 'ULTRASONIC',
  ELECTROMAGNETIC = 'ELECTROMAGNETIC',
  COMPOUND = 'COMPOUND',
  IRRIGATION = 'IRRIGATION',
}

export enum DialType {
  SEMI_DRY = 'SEMI_DRY',
  DRY = 'DRY',
  SUPER_DRY = 'SUPER_DRY',
  WET = 'WET',
}

export enum IPRating {
  IP54 = 'IP54',
  IP65 = 'IP65',
  IP67 = 'IP67',
  IP68 = 'IP68',
}

// =============================================================================
// Entity Interfaces
// =============================================================================

export interface Address {
  city?: string
  district?: string
  neighborhood?: string
  street?: string
  buildingNo?: string
  floor?: string
  doorNo?: string
  postalCode?: string
  addressCode?: string
  extraDetails?: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  tcIdNo?: string
  isActive?: boolean
  createdAt: string
  updatedAt: string
  tenantId?: string
  role?: SystemRole
  permissions?: string[] // Resolved permissions for primary tenant
  tenants?: TenantAssignment[]
}

// Module names for permissions
export enum Module {
  DASHBOARD = 'dashboard',
  READINGS = 'readings',
  SUBSCRIPTIONS = 'subscriptions',
  CUSTOMERS = 'customers',
  METERS = 'meters',
  DEVICES = 'devices',
  PROFILES = 'profiles',
  ALARMS = 'alarms',
  TENANTS = 'tenants',
  USERS = 'users',
  SETTINGS = 'settings',
}

// Permission actions
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

// Module permission structure
export interface ModulePermissions {
  module: Module
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
}

export interface TenantAssignment {
  tenantId: string
  tenantName: string
  tenantPath: string
  role: SystemRole
  permissions?: string[] // Format: "module:action" e.g., "meters:create", "customers:read"
}

export interface Tenant {
  id: string
  name: string
  path: string
  parentId?: string
  contactFirstName?: string
  contactLastName?: string
  contactPhone?: string
  contactEmail?: string
  taxId?: string
  taxOffice?: string
  latitude?: number
  longitude?: number
  addressCode?: string
  address?: Address
  tenantSubscriptionStatus: string
  subscriptionPlan?: string
  isActive?: boolean
  createdAt: string
  updatedAt: string
  children?: Tenant[]
  allowedProfiles?: MeterProfile[]
  allowedDeviceProfiles?: DeviceProfile[]
}

// =============================================================================
// Customer - No address (address is on Subscription)
// =============================================================================

export interface Customer {
  id: string
  tenantId: string
  customerNumber: string
  customerType: CustomerType
  consumptionType?: ConsumptionType
  details: CustomerDetails
  isActive?: boolean
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  tenant?: Tenant
  subscriptions?: Subscription[]
  _count?: {
    subscriptions: number
  }
}

export interface CustomerDetails {
  // Individual
  firstName?: string
  lastName?: string
  tcIdNo?: string
  phone?: string
  email?: string
  // Organizational
  organizationName?: string
  taxId?: string
  taxOffice?: string
  contactFirstName?: string
  contactLastName?: string
  contactPhone?: string
  contactEmail?: string
}

// =============================================================================
// Subscription - The CENTRAL linking entity (has address)
// =============================================================================

export interface Subscription {
  id: string
  tenantId: string
  subscriptionNumber: string
  customerId: string
  subscriptionType: SubscriptionType
  subscriptionGroup: SubscriptionGroup
  address: Address
  addressCode?: string
  latitude?: number
  longitude?: number
  isActive: boolean
  startDate: string
  endDate?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  // Relations
  tenant?: Tenant
  customer?: Customer
  meters?: Meter[]
}

// =============================================================================
// Device Profile (Electronic Communication Unit Specs)
// =============================================================================

export interface DeviceFieldDefinition {
  name: string
  label?: string
  type: 'hex' | 'string' | 'number'
  length?: number
  regex?: string
  required: boolean
  description?: string
}

export interface DeviceCommunicationConfig {
  technology: CommunicationTechnology
  fieldDefinitions: DeviceFieldDefinition[]
  decoderFunction?: string
  testPayload?: string
}

export interface DeviceProfile {
  id: string
  brand: DeviceBrand
  modelCode: string
  communicationTechnology: CommunicationTechnology
  integrationType: IntegrationType
  fieldDefinitions: DeviceFieldDefinition[]
  decoderFunction?: string
  testPayload?: string
  expectedOutput?: Record<string, unknown>
  lastTestedAt?: string
  lastTestSucceeded?: boolean
  batteryLifeMonths?: number
  specifications?: Record<string, unknown>
  communicationConfigs?: DeviceCommunicationConfig[]
  createdAt: string
  updatedAt: string
  compatibleMeterProfiles?: MeterProfile[]
}

// =============================================================================
// Device (Physical Communication Unit - Inventory Item)
// =============================================================================

export interface Device {
  id: string
  tenantId: string
  deviceProfileId: string
  serialNumber: string
  status: DeviceStatus
  // Dynamic fields populated based on DeviceProfile's field definitions
  dynamicFields: Record<string, string>
  lastSignalStrength?: number
  lastBatteryLevel?: number
  lastCommunicationAt?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  tenant?: Tenant
  deviceProfile?: DeviceProfile
  meter?: Meter
}

// =============================================================================
// Meter Profile (Mechanical Meter Specs)
// =============================================================================

export interface MeterProfile {
  id: string
  brand: Brand
  modelCode: string
  meterType: MeterType
  dialType: DialType
  connectionType: string
  mountingType: string
  temperatureType: string
  diameter?: number
  length?: number
  width?: number
  height?: number
  q1?: number
  q2?: number
  q3?: number
  q4?: number
  rValue?: number
  pressureLoss?: number
  ipRating?: IPRating
  communicationModule: CommunicationModule
  specifications?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  compatibleDeviceProfiles?: DeviceProfile[]
  allowedTenants?: Tenant[]
  _count?: {
    meters: number
  }
}

// =============================================================================
// Meter (Asset - linked to Subscription, not Customer)
// =============================================================================

export interface Meter {
  id: string
  tenantId: string
  subscriptionId?: string // Now linked to subscription
  meterProfileId: string
  activeDeviceId?: string
  serialNumber: string
  initialIndex: number
  installationDate: string
  status: MeterStatus
  valveStatus: ValveStatus
  lastReadingValue?: number
  lastReadingTime?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  // Relations
  tenant?: Tenant
  subscription?: Subscription // Now includes customer and address
  meterProfile?: MeterProfile
  activeDevice?: Device
  readings?: Reading[]
  alarms?: Alarm[]
}

export interface Reading {
  id: string
  time: string
  tenantId: string
  meterId: string
  value: number
  consumption: number
  unit: string
  signalStrength?: number
  batteryLevel?: number
  temperature?: number
  rawPayload?: Record<string, unknown>
  source?: string
  sourceDeviceId?: string
  communicationTechnology?: CommunicationTechnology
  processedAt?: string
  decoderUsed?: string
  meter?: Meter
}

export interface Alarm {
  id: string
  meterId: string
  tenantId: string
  type: string
  status: string
  severity: number
  message?: string
  details?: Record<string, unknown>
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
  meter?: Meter
}

export interface DecoderFunction {
  id: string
  name: string
  description?: string
  technology: CommunicationTechnology
  functionCode: string
  testPayload?: string
  expectedOutput?: Record<string, unknown>
  lastTestedAt?: string
  lastTestSucceeded?: boolean
  deviceProfileId: string
  deviceProfile?: {
    id: string
    brand: DeviceBrand
    modelCode: string
  }
  createdAt: string
  updatedAt: string
}

export interface PlatformSettings {
  id: string
  domain?: string
  httpCallbackUrl?: string
  mqttUrl?: string
  logoUrl?: string
  platformName: string
  platformTitle?: string
  platformDescription?: string
  updatedAt: string
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

// =============================================================================
// Form Types
// =============================================================================

export interface LoginForm {
  email: string
  password: string
}

export interface CreateSubscriptionForm {
  tenantId: string
  subscriptionNumber: string
  customerId: string
  subscriptionType: SubscriptionType
  subscriptionGroup?: SubscriptionGroup
  address: Address
  latitude?: number
  longitude?: number
  isActive?: boolean
  startDate?: string
}

export interface CreateMeterForm {
  tenantId: string
  meterProfileId: string
  subscriptionId?: string
  serialNumber: string
  initialIndex?: number
  status?: MeterStatus
  installationDate: string
}

export interface CreateDeviceForm {
  tenantId: string
  deviceProfileId: string
  serialNumber: string
  status?: DeviceStatus
  // Dynamic fields populated based on DeviceProfile's field definitions
  dynamicFields: Record<string, string>
  metadata?: Record<string, unknown>
}

export interface LinkDeviceForm {
  deviceId: string
}

export interface UnlinkDeviceForm {
  deviceStatus?: 'WAREHOUSE' | 'MAINTENANCE'
}

export interface CreateCustomerForm {
  tenantId: string
  customerNumber: string
  customerType: CustomerType
  details: CustomerDetails
}

// =============================================================================
// Dashboard Types
// =============================================================================

export interface DashboardStats {
  totalMeters: number
  totalCustomers: number
  totalSubscriptions: number
  totalReadings: number
  totalWaterUsage: number
  activeAlarms: number
  metersInMaintenance: number
  metersOffline: number
  totalDevices?: number
  devicesInWarehouse?: number
  devicesDeployed?: number
}

export interface MeterMapData {
  id: string
  latitude: number
  longitude: number
  status: MeterStatus
  hasAlarm: boolean
  isHighUsage: boolean
  isOffline: boolean
  serialNumber: string
  customerName?: string
  address?: Address
}

// =============================================================================
// Communication Technology Field Definitions (Static Reference)
// =============================================================================

export interface TechFieldDefinition {
  name: string
  label: string
  type: string
  length: number
  regex: string
  required: boolean
  description?: string
}

export const COMMUNICATION_TECH_FIELDS: Record<CommunicationTechnology, TechFieldDefinition[]> = {
  [CommunicationTechnology.SIGFOX]: [
    { name: 'ID', label: 'Sigfox ID', type: 'hex', length: 8, regex: '^[a-fA-F0-9]{8}$', required: true },
    { name: 'PAC', label: 'PAC', type: 'hex', length: 16, regex: '^[a-fA-F0-9]{16}$', required: true },
  ],
  [CommunicationTechnology.LORAWAN]: [
    { name: 'DevEUI', label: 'Device EUI', type: 'hex', length: 16, regex: '^[a-fA-F0-9]{16}$', required: true },
    { name: 'JoinEUI', label: 'Join EUI', type: 'hex', length: 16, regex: '^[a-fA-F0-9]{16}$', required: true },
    { name: 'AppKey', label: 'Application Key', type: 'hex', length: 32, regex: '^[a-fA-F0-9]{32}$', required: true },
  ],
  [CommunicationTechnology.NB_IOT]: [
    { name: 'IMEI', label: 'IMEI', type: 'string', length: 15, regex: '^[0-9]{15}$', required: true },
    { name: 'IMSI', label: 'IMSI', type: 'string', length: 15, regex: '^[0-9]{15}$', required: false },
    { name: 'ICCID', label: 'SIM ICCID', type: 'string', length: 20, regex: '^[0-9]{18,20}$', required: false },
  ],
  [CommunicationTechnology.WM_BUS]: [
    { name: 'ManufacturerId', label: 'Manufacturer ID', type: 'string', length: 3, regex: '^[A-Z]{3}$', required: true },
    { name: 'DeviceId', label: 'Device ID', type: 'hex', length: 8, regex: '^[a-fA-F0-9]{8}$', required: true },
    { name: 'EncryptionKey', label: 'Encryption Key', type: 'hex', length: 32, regex: '^[a-fA-F0-9]{32}$', required: false },
  ],
  [CommunicationTechnology.MIOTY]: [
    { name: 'ShortAddress', label: 'Short Address', type: 'hex', length: 8, regex: '^[a-fA-F0-9]{8}$', required: true },
    { name: 'EUI64', label: 'EUI-64', type: 'hex', length: 16, regex: '^[a-fA-F0-9]{16}$', required: true },
  ],
  [CommunicationTechnology.WIFI]: [
    { name: 'MacAddress', label: 'MAC Address', type: 'string', length: 17, regex: '^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$', required: true },
  ],
  [CommunicationTechnology.BLUETOOTH]: [
    { name: 'MacAddress', label: 'BLE MAC Address', type: 'string', length: 17, regex: '^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$', required: true },
  ],
  [CommunicationTechnology.NFC]: [
    { name: 'UID', label: 'NFC UID', type: 'hex', length: 14, regex: '^[a-fA-F0-9]{4,14}$', required: true },
  ],
  [CommunicationTechnology.OMS]: [
    { name: 'ManufacturerId', label: 'Manufacturer ID', type: 'string', length: 3, regex: '^[A-Z]{3}$', required: true },
    { name: 'DeviceId', label: 'Device ID', type: 'hex', length: 8, regex: '^[a-fA-F0-9]{8}$', required: true },
  ],
}
