// =============================================================================
// TypeScript Type Definitions - Read Water Frontend
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
  DEPLOYED_NOT_STARTED = 'DEPLOYED_NOT_STARTED',
}

export enum ValveStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  UNKNOWN = 'UNKNOWN',
}

export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  ORGANIZATIONAL = 'ORGANIZATIONAL',
}

export enum ConsumptionType {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
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

export enum CommunicationModule {
  INTEGRATED = 'INTEGRATED',
  RETROFIT = 'RETROFIT',
  NONE = 'NONE',
}

export enum Brand {
  BAYLAN = 'BAYLAN',
  MANAS = 'MANAS',
  KLEPSAN = 'KLEPSAN',
  CEM = 'CEM',
  ZENNER = 'ZENNER',
  TURKOGLU = 'TURKOGLU',
  BEREKET = 'BEREKET',
  TEKSAN = 'TEKSAN',
}

export enum MeterType {
  SINGLE_JET = 'SINGLE_JET',
  MULTI_JET = 'MULTI_JET',
  WOLTMAN_PARALLEL = 'WOLTMAN_PARALLEL',
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
  city: string
  district: string
  neighborhood?: string
  street?: string
  buildingNo?: string
  floor?: string
  doorNo?: string
  postalCode?: string
  extraDetails?: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  tcIdNo?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  tenants: TenantAssignment[]
}

export interface TenantAssignment {
  tenantId: string
  tenantName: string
  tenantPath: string
  role: SystemRole
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
  subscriptionStatus: string
  subscriptionPlan?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  children?: Tenant[]
}

export interface Customer {
  id: string
  tenantId: string
  customerType: CustomerType
  consumptionType: ConsumptionType
  details: CustomerDetails
  latitude?: number
  longitude?: number
  addressCode?: string
  address?: Address
  isActive: boolean
  createdAt: string
  updatedAt: string
  meters?: Meter[]
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

export interface Meter {
  id: string
  tenantId: string
  customerId?: string
  profileId: string
  serialNumber: string
  deviceId?: string
  initialIndex: number
  currentIndex: number
  status: MeterStatus
  valveStatus: ValveStatus
  installationDate?: string
  latitude?: number
  longitude?: number
  addressCode?: string
  address?: Address
  connectivityConfig: ConnectivityConfig
  lastReading?: Reading
  isActive: boolean
  createdAt: string
  updatedAt: string
  customer?: Customer
  profile?: MeterProfile
  tenant?: Tenant
}

export interface ConnectivityConfig {
  primary?: TechnologyConfig
  secondary?: TechnologyConfig
  other?: TechnologyConfig[]
}

export interface TechnologyConfig {
  technology: CommunicationTechnology
  fields: Record<string, string>
}

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
  ipRating: IPRating
  communicationModule: CommunicationModule
  communicationConfig?: CommunicationConfig[]
  batteryLife?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  tenants?: Tenant[]
}

export interface CommunicationConfig {
  technology: CommunicationTechnology
  decoderFunction?: string
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
  alarmType: string
  severity: string
  message: string
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
  technology: CommunicationTechnology
  profileId?: string
  functionCode: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  profile?: MeterProfile
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

export interface CreateMeterForm {
  tenantId: string
  customerId?: string
  profileId: string
  serialNumber: string
  deviceId?: string
  initialIndex: number
  status: MeterStatus
  installationDate?: string
  latitude?: number
  longitude?: number
  addressCode?: string
  address?: Address
  connectivityConfig: ConnectivityConfig
}

export interface CreateCustomerForm {
  tenantId: string
  customerType: CustomerType
  consumptionType: ConsumptionType
  details: CustomerDetails
  latitude?: number
  longitude?: number
  addressCode?: string
  address?: Address
}

// =============================================================================
// Dashboard Types
// =============================================================================

export interface DashboardStats {
  totalMeters: number
  totalCustomers: number
  totalReadings: number
  totalWaterUsage: number
  activeAlarms: number
  metersInMaintenance: number
  metersOffline: number
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
}

// =============================================================================
// Communication Technology Field Definitions
// =============================================================================

export interface TechFieldDefinition {
  keyName: string
  keyType: string
  keyLength: number
  validationRegex: string
  description?: string
}

export const COMMUNICATION_TECH_FIELDS: Record<CommunicationTechnology, TechFieldDefinition[]> = {
  [CommunicationTechnology.SIGFOX]: [
    { keyName: 'ID', keyType: 'Hexadecimal String', keyLength: 8, validationRegex: '^[a-fA-F0-9]{8}$' },
    { keyName: 'PAC', keyType: 'Hexadecimal String', keyLength: 16, validationRegex: '^[a-fA-F0-9]{16}$' },
  ],
  [CommunicationTechnology.LORAWAN]: [
    { keyName: 'DevEUI', keyType: 'Hexadecimal String', keyLength: 16, validationRegex: '^[a-fA-F0-9]{16}$' },
    { keyName: 'JoinEUI', keyType: 'Hexadecimal String', keyLength: 16, validationRegex: '^[a-fA-F0-9]{16}$' },
    { keyName: 'AppKey', keyType: 'Hexadecimal String', keyLength: 32, validationRegex: '^[a-fA-F0-9]{32}$' },
  ],
  [CommunicationTechnology.NB_IOT]: [
    { keyName: 'IMEI', keyType: 'Numeric String', keyLength: 15, validationRegex: '^[0-9]{15}$' },
    { keyName: 'IMSI', keyType: 'Numeric String', keyLength: 15, validationRegex: '^[0-9]{15}$' },
  ],
  [CommunicationTechnology.WM_BUS]: [
    { keyName: 'ManufacturerId', keyType: 'String', keyLength: 3, validationRegex: '^[A-Z]{3}$' },
    { keyName: 'DeviceId', keyType: 'Hexadecimal String', keyLength: 8, validationRegex: '^[a-fA-F0-9]{8}$' },
  ],
  [CommunicationTechnology.MIOTY]: [
    { keyName: 'EUI', keyType: 'Hexadecimal String', keyLength: 16, validationRegex: '^[a-fA-F0-9]{16}$' },
  ],
  [CommunicationTechnology.WIFI]: [
    { keyName: 'MAC', keyType: 'MAC Address', keyLength: 17, validationRegex: '^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$' },
  ],
  [CommunicationTechnology.BLUETOOTH]: [
    { keyName: 'MAC', keyType: 'MAC Address', keyLength: 17, validationRegex: '^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$' },
  ],
  [CommunicationTechnology.NFC]: [
    { keyName: 'UID', keyType: 'Hexadecimal String', keyLength: 14, validationRegex: '^[a-fA-F0-9]{14}$' },
  ],
  [CommunicationTechnology.OMS]: [
    { keyName: 'DeviceId', keyType: 'Hexadecimal String', keyLength: 8, validationRegex: '^[a-fA-F0-9]{8}$' },
  ],
}

