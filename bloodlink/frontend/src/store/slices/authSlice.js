import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { connectSocket, disconnectSocket } from '../../utils/socket';

const BASE_URL = 'http://localhost:5000/api';

const authAPI = axios.create({ baseURL: BASE_URL, timeout: 10000 });

authAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.post('/auth/login', credentials);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    connectSocket(data.accessToken);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed. Is backend running?');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.post('/auth/register', userData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    connectSocket(data.accessToken);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed.');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await authAPI.post('/auth/logout'); } catch {}
  localStorage.clear();
  disconnectSocket();
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.get('/auth/me');
    return data;
  } catch (err) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return rejectWithValue('Session expired');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: localStorage.getItem('accessToken'),
    loading: false,
    error: null,
    // No token = no need to verify = already initialized
    initialized: !localStorage.getItem('accessToken'),
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    forceInitialized: (state) => { state.initialized = true; },
  },
  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.initialized = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.initialized = true;
      })

      // REGISTER
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.initialized = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.initialized = true;
      })

      // LOGOUT
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.initialized = true;
      })

      // FETCH ME (page refresh)
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = localStorage.getItem('accessToken');
        state.initialized = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.initialized = true;
      });
  },
});

export const { clearError, forceInitialized } = authSlice.actions;
export default authSlice.reducer;