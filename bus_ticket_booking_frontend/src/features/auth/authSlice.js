import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const loginUser = createAsyncThunk("auth/loginUser", async (credentials, { rejectWithValue }) => {
  try {
    const res = await api.post("/auth/login", credentials);
    localStorage.setItem("accessToken", res.data.data.accessToken);
    if (res.data.data.refreshToken) {
      localStorage.setItem("refreshToken", res.data.data.refreshToken);
    }
    const role = res.data.data.user.role || "user";
    localStorage.setItem("userRole", role);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Login failed");
  }
});

export const adminLoginUser = createAsyncThunk("auth/adminLoginUser", async (credentials, { rejectWithValue }) => {
  try {
    const res = await api.post("/auth/admin/login", credentials);
    localStorage.setItem("accessToken", res.data.data.accessToken);
    if (res.data.data.refreshToken) {
      localStorage.setItem("refreshToken", res.data.data.refreshToken);
    }
    const role = res.data.data.user.role || "admin";
    localStorage.setItem("userRole", role);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Admin login failed");
  }
});

export const registerUser = createAsyncThunk("auth/registerUser", async (userData, { rejectWithValue }) => {
  try {
    const res = await api.post("/auth/register", userData);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Registration failed");
  }
});

const initialState = {
  user: null,
  token: localStorage.getItem("accessToken") || null,
  role: localStorage.getItem("userRole") || null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      if (action.payload.user) {
        state.user = action.payload.user;
        state.role = action.payload.user.role || action.payload.role || localStorage.getItem("userRole") || "user";
      }
      if (action.payload.token) state.token = action.payload.token;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.role = null;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userRole");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.role = action.payload.user.role;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(adminLoginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.role = action.payload.user?.role || "admin";
      });
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
