import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async register(email: string, password: string, user_type: string) {
    return this.client.post('/api/v1/auth/register', { email, password, user_type });
  }

  async login(email: string, password: string) {
    return this.client.post('/api/v1/auth/login', { email, password });
  }

  // Chat - Streaming
  async chatStreamingQuery(message: string): Promise<ReadableStream<Uint8Array> | null> {
    const response = await fetch(`${API_URL}/api/v1/chat/query-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) throw new Error('Stream failed');
    return response.body;
  }

  // Orders
  async getCheckoutDetails(token: string) {
    return this.client.get(`/api/v1/orders/checkout/${token}`);
  }

  async createOrder(data: any) {
    return this.client.post('/api/v1/orders/create', data);
  }

  async confirmPayment(orderId: string, paymentData: any) {
    return this.client.post(`/api/v1/orders/${orderId}/confirm-payment`, paymentData);
  }

  async getOrderTracking(orderId: string) {
    return this.client.get(`/api/v1/orders/${orderId}/track`);
  }

  // Wallet
  async getWalletBalance() {
    return this.client.get('/api/v1/wallet/balance');
  }

  async applyPromoCode(code: string, testId: string) {
    return this.client.post('/api/v1/wallet/apply-promo', { code, test_id: testId });
  }

  // Dashboard
  async getDashboardStats() {
    return this.client.get('/api/v1/dashboard/doctor/stats');
  }

  async getDoctorRecommendations(page: number = 1) {
    return this.client.get('/api/v1/dashboard/doctor/recommendations', {
      params: { page, limit: 20 },
    });
  }

  async getConversionTrends() {
    return this.client.get('/api/v1/dashboard/doctor/trends');
  }

  // Share
  async shareTest(testId: string, phoneNumber: string) {
    return this.client.post('/api/v1/chat/share', {
      test_id: testId,
      phone_number: phoneNumber,
    });
  }
}

export const apiClient = new APIClient();
