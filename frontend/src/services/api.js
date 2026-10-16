
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

function authConfig(token) {
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
}

function getErrorMessage(error) {
  return (
    error.response?.data?.error ||
    error.message ||
    "Something went wrong"
  );
}

export async function checkHealth() {
  try {
    const { data } = await api.get("/health");
    return data;
  } catch (error) {
    return {
      status: "offline",
      error: getErrorMessage(error),
    };
  }
}

export async function fetchSlots() {
  try {
    const { data } = await api.get("/slots");
    return data.slots || [];
  } catch (error) {
    console.error("Failed to fetch slots:", getErrorMessage(error));
    return [];
  }
}

export async function requestEmailCode(email, name) {
  try {
    const { data } = await api.post("/auth/request-code", {
      email,
      name,
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

export async function verifyEmailCode(email, code) {
  try {
    const { data } = await api.post("/auth/verify-code", {
      email,
      code,
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

export async function getAuthSession(token) {
  try {
    const { data } = await api.get(
      "/auth/session",
      authConfig(token)
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

export async function logoutSession(token) {
  try {
    const { data } = await api.post(
      "/auth/logout",
      {},
      authConfig(token)
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

export async function updateAuthProfile(name, token) {
  try {
    const { data } = await api.put(
      "/auth/profile",
      { name },
      authConfig(token)
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

export async function sendChatMessage(
  message,
  threadId,
  booking = null,
  token = null
) {
  try {
    const { data } = await api.post(
      "/chat",
      {
        message,
        threadId,
        clientBooking: booking,
      },
      authConfig(token)
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

export async function fetchUserBookings(token) {
  try {
    const { data } = await api.get(
      "/user/bookings",
      authConfig(token)
    );
    return data.bookings || [];
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

export async function cancelUserBooking(referenceId, token) {
  try {
    const { data } = await api.post(
      `/user/bookings/${encodeURIComponent(referenceId)}/cancel`,
      {},
      authConfig(token)
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}
