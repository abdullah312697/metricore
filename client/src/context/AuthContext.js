// AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { Altaxios } from "../frontend/Altaxios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
  const checkLogin = async () => {
    setLoading(true);
    try{
      const res = await Altaxios.get("/users/vefiryUsersLog");
      const access = res.data?.AccessData;
      setUser(access);
    } catch (err) {
      console.log(err);
    }finally{
      setLoading(false);
    }
  }

  checkLogin();
}, []);
  // LOGIN
  const login = async (email, password) => {
    const res = await Altaxios.post("/users/useLogin", { email, password });
    if (res.status === 200) {
      setUser(res.data.AccessData);
      return { success: true, data: res.data.AccessData };
    }

    return { success: false };
  };

  // REGISTER
// REGISTER (Correct)
const register = async (companyData) => {
  const res = await Altaxios.post("/users/register", companyData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  // store user access data
  setUser(res.data.AccessData);

  return res; // return full axios response
};

const emailVerify = async (verifyCode) => {
    const response = await Altaxios.post("/users/verifyCode", {
      verifyCode,
    });

  // store user access data
  setUser(response.data.AccessData);

  return response; // return full axios response
};

  // LOGOUT
  const logout = async () => {
    try {
      await Altaxios.get("/users/logout");
      setUser(null);
      return true;        // ❗ Caller will handle redirect
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const updateEmployee = async (employeeId,employeeData) => {
      const updEmployee = await Altaxios.put(`/newemplyee/updateEmployee/${employeeId}`,employeeData);
      const currentUser = user?.employeeId;
      const updatedEmployee = updEmployee.data.AccessData
      if(currentUser === updatedEmployee.employeeId){
        setUser(updatedEmployee);
      }
      return updEmployee;
  };

    const updateProfile = async (employeeId,employeeData) => {
    const updEmployeeProfile = await Altaxios.patch(`/newemplyee/ChangeProfile/${encodeURIComponent(employeeId)}`,employeeData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
      const currentUser = user?.employeeId;
      const updatedEmployee = updEmployeeProfile.data.AccessData;
      if(currentUser === updatedEmployee.employeeId){
        setUser(updatedEmployee);
      }

      return updEmployeeProfile;
  };



  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, register, emailVerify, updateEmployee, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
