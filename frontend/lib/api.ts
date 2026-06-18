import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("tz_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("tz_token");
      localStorage.removeItem("tz_user");
      window.location.href = "/auth/login";
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", new URLSearchParams({ username: email, password }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  register: (data: Record<string, unknown>) => api.post("/auth/register", data),
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post("/auth/reset-password", { token, new_password }),
};

export const chatApi = {
  query: (message: string, sessionId?: string) =>
    api.post("/chat/query", { message, session_id: sessionId }),
  share: (testId: string, patientPhone: string, patientName?: string, caseDesc?: string) =>
    api.post("/chat/share", null, {
      params: { test_id: testId, patient_phone: patientPhone, patient_name: patientName, case_description: caseDesc },
    }),
  history: () => api.get("/chat/history"),
};

export const ordersApi = {
  getCheckout: (token: string) => api.get(`/orders/checkout/${token}`),
  createOrder: (data: Record<string, unknown>) => api.post("/orders/create", data),
  confirmPayment: (orderId: string) => api.post(`/orders/${orderId}/pay`),
  track: (orderId: string) => api.get(`/orders/track/${orderId}`),
  myOrders: () => api.get("/orders/patient/my-orders"),
  paymentHistory: () => api.get("/orders/patient/payment-history"),
  exportCsv: () => api.get("/orders/doctor/export-csv", { responseType: "blob" }),
};

export const walletApi = {
  balance: () => api.get("/wallet/balance"),
  referral: () => api.get("/wallet/referral"),
  applyReferral: (code: string) => api.post("/wallet/apply-referral", { referral_code: code }),
};

export const dashboardApi = {
  stats: () => api.get("/dashboard/doctor/stats"),
  remind: (recId: string) => api.post(`/dashboard/doctor/remind/${recId}`),
  exportCsv: () => api.get("/orders/doctor/export-csv", { responseType: "blob" }),
};
