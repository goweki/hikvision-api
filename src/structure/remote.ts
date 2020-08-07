export interface RemoteSessionParams {
  SessionLoginCap: {
    sessionID: string,
    challenge: string,
    iterations: string,
    isIrreversible: string,
    salt: string
  }
}

export interface RemoteLoginResult {
  SessionUserCheck?: {
    statusValue: string,
    statusString: string,
    isDefaultPassword: string,
    isRiskPassword: string,
    isActivated: string,
    sessionID: string
  },
  SessionLogin?: {
    statusValue: string,
    statusString: string,
    sessionID: string
  }
}

export interface RemoteChannel {
  id: string,
  name: string,
  sourceInputPortDescriptor: {
    proxyProtocol: string,
    addressingFormatType: string,
    ipAddress: string,
    managePortNo: string,
    srcInputPort: string,
    userName: string,
    streamType: string,
    deviceID: string
  }
  enableAnr: string,
  enableTiming: string
}

export interface RemoteChannelResult {
  InputProxyChannelList: {
    InputProxyChannel?: RemoteChannel | RemoteChannel[]
  }
}

export interface RemoteDeviceInfo {
  DeviceInfo: {
    deviceName: string
    deviceID: string
    model: string
    serialNumber: string
    macAddress: string
    firmwareVersion: string
    firmwareReleasedDate: string
    encoderVersion: string
    encoderReleasedDate: string
    deviceType: string
    telecontrolID: string
  }
}

export interface RemoteTimeStatus {
  Time: {
    timeMode: 'NTP' | 'manual',
    localTime: string,
    timeZone: string
  }
}

export interface RemoteSSHStatus {
  SSH: {
    enabled: 'true' | 'false'
  }
}

export interface NvrResponse {
  ResponseStatus: {
    requestURL: string
    statusCode: string
    statusString: string
    subStatusCode: string
  }
}

export interface RemoteSearchDevice {
  id: string,
  proxyProtocol: string,
  addressingFormatType: string,
  ipAddress: string,
  subnetMask: string,
  serialNumber: string,
  macAddress: string,
  firmwareVersion: string,
  managePortNo: string,
  userName: string,
  password: string,
  srcInputPortNums: string,
  deviceID: string,
  activated: string
}

export interface RemoteSearchResult {
  VideoSourceList: {
    VideoSourceDescriptor?: RemoteSearchDevice | RemoteSearchDevice[]
  }
}

export interface RemoteUserList {
  UserList: {
    User: []
  }
}

export interface SecurityVersion {
  SecurityCap: {
    supportUserNums: string
    userBondIpNums: string
    userBondMacNums: string
    securityVersion: { '$': any },
    keyIterateNum: string,
    isSupportUserCheck: 'true' | 'false'
    isIrreversible: 'true' | 'false'
    salt: string
    isSupportGUIDFileDataExport: 'true' | 'false'
    isSupportSecurityQuestionConfig: 'true' | 'false'
    isSupportGetOnlineUserListSC: 'true' | 'false'
    SecurityLimits: {
      LoginPasswordLenLimit: any,
      SecurityAnswerLenLimit: any
    },
    RSAKeyLength: { '$': any },
    isSupportONVIFUserManagement: 'true' | 'false'
    WebCertificateCap: { CertificateType: any },
    isSupportConfigFileImport: 'true' | 'false'
    isSupportConfigFileExport: 'true' | 'false'
    cfgFileSecretKeyLenLimit: { '$': any },
    isSupportPictureURlCertificate: 'true' | 'false'
  }
}