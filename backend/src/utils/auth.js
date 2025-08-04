// utils/auth.js
import jwt_decode from "jwt-decode";

export const getCurrentUserFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwt_decode(token); // chứa { id, email, role }
    return decoded;
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
};
