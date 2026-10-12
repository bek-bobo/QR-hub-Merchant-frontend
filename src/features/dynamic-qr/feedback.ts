// Only verified frontend-owned controller reasons are classified. Arbitrary
// backend errors remain data and never become message identifiers.
export type QrActionFeedback = 'permission' | 'selection' | 'unavailable' | 'alreadySent' | 'unknown' | 'notSent'
export function describeQrActionFeedback(reason: string): QrActionFeedback {
  switch (reason) {
    case 'Ruxsat mavjud emas.': return 'permission'
    case 'Terminal, summa yoki valyuta tanlovini tekshiring.':
    case 'Terminalni qayta tanlang.': return 'selection'
    case 'QR yaratish transporti mavjud emas.':
    case 'Bekor qilish hozircha mavjud emas.':
    case 'Amal hozir mavjud emas.': return 'unavailable'
    case 'Bu intent allaqachon yuborilgan. Yangi amalni alohida tanlang.': return 'alreadySent'
    case 'Natija tasdiqlanmadi. Qayta yuborishdan oldin ro‘yxatdagi holatni tekshiring.': return 'unknown'
    default: return 'notSent'
  }
}
