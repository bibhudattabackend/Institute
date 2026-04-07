import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Students from './pages/Students.jsx'
import StudentForm from './pages/StudentForm.jsx'
import AdmissionLetter from './pages/AdmissionLetter.jsx'
import Profile from './pages/Profile.jsx'
import Universities from './pages/Universities.jsx'
import CourseFees from './pages/CourseFees.jsx'
import ApplicationForm from './pages/ApplicationForm.jsx'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="page center">
        <div className="spinner" aria-label="Loading" />
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/new" element={<StudentForm />} />
        <Route path="students/:id/edit" element={<StudentForm />} />
        <Route path="students/:id/letter" element={<AdmissionLetter />} />
        <Route path="students/:id/application" element={<ApplicationForm />} />
        <Route path="universities" element={<Universities />} />
        <Route path="course-fees" element={<CourseFees />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
