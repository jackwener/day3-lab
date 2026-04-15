/**
 * LocalStorage Service - 本地存储服务
 * 用于存储用户偏好、收藏等前端独立数据
 */

const STORAGE_KEYS = {
  USER: 'investqa_user',
  FAVORITES: 'investqa_favorites',
  PREFERENCES: 'investqa_preferences',
}

// ==================== 用户相关 ====================

export function saveUser(user) {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
    return true
  } catch (error) {
    console.error('Failed to save user:', error)
    return false
  }
}

export function getUser() {
  try {
    const user = localStorage.getItem(STORAGE_KEYS.USER)
    return user ? JSON.parse(user) : null
  } catch (error) {
    console.error('Failed to get user:', error)
    return null
  }
}

export function clearUser() {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER)
    return true
  } catch (error) {
    console.error('Failed to clear user:', error)
    return false
  }
}

// ==================== 收藏相关 ====================

export function getFavorites() {
  try {
    const favorites = localStorage.getItem(STORAGE_KEYS.FAVORITES)
    return favorites ? JSON.parse(favorites) : []
  } catch (error) {
    console.error('Failed to get favorites:', error)
    return []
  }
}

export function saveFavorites(favorites) {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites))
    return true
  } catch (error) {
    console.error('Failed to save favorites:', error)
    return false
  }
}

export function addFavorite(item) {
  const favorites = getFavorites()
  const exists = favorites.find(f => f.record_id === item.record_id)
  if (!exists) {
    favorites.unshift({
      ...item,
      favorited_at: new Date().toISOString(),
    })
    saveFavorites(favorites)
  }
  return favorites
}

export function removeFavorite(recordId) {
  const favorites = getFavorites()
  const filtered = favorites.filter(f => f.record_id !== recordId)
  saveFavorites(filtered)
  return filtered
}

export function isFavorite(recordId) {
  const favorites = getFavorites()
  return favorites.some(f => f.record_id === recordId)
}

// ==================== 偏好设置 ====================

export function getPreferences() {
  try {
    const prefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES)
    return prefs ? JSON.parse(prefs) : {
      theme: 'dark',
      fontSize: 'medium',
      showTimestamp: true,
    }
  } catch (error) {
    console.error('Failed to get preferences:', error)
    return {}
  }
}

export function savePreferences(prefs) {
  try {
    const current = getPreferences()
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify({
      ...current,
      ...prefs,
    }))
    return true
  } catch (error) {
    console.error('Failed to save preferences:', error)
    return false
  }
}

// ==================== 生成UUID ====================

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default {
  saveUser,
  getUser,
  clearUser,
  getFavorites,
  saveFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  getPreferences,
  savePreferences,
  generateUUID,
}
