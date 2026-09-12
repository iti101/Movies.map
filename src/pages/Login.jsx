import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

/** Legacy /login route: open the sign-in modal and return home. */
function Login() {
  const navigate = useNavigate()
  const { isAuth, openLogin } = useAuth()

  useEffect(() => {
    if (isAuth) {
      navigate('/', { replace: true })
      return
    }
    openLogin()
    navigate('/', { replace: true })
  }, [isAuth, navigate, openLogin])

  return null
}

export default Login
