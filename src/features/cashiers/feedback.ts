// Only verified frontend-owned reasons are classified. Backend text stays data.
export type CashierFeedback = 'permission' | 'validation' | 'selection' | 'stale' | 'unavailable' | 'notSent' | 'alreadySent'
export const cashierFeedbackKeys = {
  permission: 'feedback.permission', validation: 'feedback.validation',
  selection: 'feedback.selection', stale: 'feedback.stale',
  unavailable: 'feedback.unavailable', notSent: 'feedback.notSent',
  alreadySent: 'feedback.alreadySent',
} as const

export function describeCashierFeedback(reason: string): CashierFeedback {
  switch (reason) {
    case 'Ruxsat mavjud emas.':
    case 'Kassir yaratish huquqi mavjud emas.':
    case 'Terminal biriktirish huquqi mavjud emas.': return 'permission'
    case 'F.I.Sh., telefon va joriy terminal tanlovini tekshiring.': return 'validation'
    case 'Joriy faol bo‘lmagan, tasdiqlangan terminallarni tanlang.': return 'selection'
    case 'Kassir tanlovi eskirgan. Ro‘yxatni yangilang.':
    case 'Tasdiqlangan kassir yoki faol terminal tanlovi eskirgan.':
    case 'Faol terminal tanlovi mavjud emas.': return 'stale'
    case 'Kassir yaratish transporti mavjud emas.':
    case 'Terminal biriktirish transporti mavjud emas.':
    case 'Terminalni ajratish transporti mavjud emas.':
    case 'Amal hozir mavjud emas.': return 'unavailable'
    case 'Bu intent allaqachon yuborilgan. Yangi amalni alohida tanlang.': return 'alreadySent'
    default: return 'notSent'
  }
}
