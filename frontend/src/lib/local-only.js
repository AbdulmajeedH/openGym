// Personal static deployment: no account, backend, or demo seed.
export const LOCAL_ONLY = import.meta.env.VITE_LOCAL_ONLY === '1'
export const LOCAL_CONFIG = Object.freeze({ allow_guest: true, default_lang: 'ar', coach: null, password_login: false })
