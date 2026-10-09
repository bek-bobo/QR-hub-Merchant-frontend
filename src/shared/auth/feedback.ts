// Presentation-neutral outcomes. Controllers never depend on a locale or catalog.
export type DeviceLeaseFeedback = 'ownerBusy' | 'browserUnsupported' | 'deviceStorageUnavailable'
export type LoginFeedback = DeviceLeaseFeedback
  | 'invalidPhone' | 'invalidOtp' | 'invalidPin' | 'pinMismatch'
  | 'otpNotExpired' | 'otpExpired' | 'wrongOtp' | 'wrongPin'
  | 'sessionExpired' | 'blocked' | 'rateLimited' | 'unavailable'
  | 'contract' | 'request' | 'completing' | 'complete'
export type ProfileRefreshFeedback = 'changed' | 'unchanged' | 'failed'
export type LogoutFeedback = 'remoteUnconfirmed'
