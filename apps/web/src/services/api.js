// Use relative URLs - nginx will proxy to backend
const API_BASE_URL = "/api";

// Generic API request function
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}

// People API functions
export const peopleAPI = {
  getAll: () => apiRequest("/people"),

  getById: (id) => apiRequest(`/people/${id}`),

  create: (personData) =>
    apiRequest("/people", {
      method: "POST",
      body: JSON.stringify(personData),
    }),

  update: (id, personData) =>
    apiRequest(`/people/${id}`, {
      method: "PUT",
      body: JSON.stringify(personData),
    }),

  delete: (id) =>
    apiRequest(`/people/${id}`, {
      method: "DELETE",
    }),
};

// Categories API functions
export const categoriesAPI = {
  getAll: () => apiRequest("/categories"),

  create: (categoryData) =>
    apiRequest("/categories", {
      method: "POST",
      body: JSON.stringify(categoryData),
    }),
};

// Items API functions
export const itemsAPI = {
  getAll: () => apiRequest("/items"),

  getByPersonId: (personId) => apiRequest(`/items/person/${personId}`),

  create: (itemData) =>
    apiRequest("/items", {
      method: "POST",
      body: JSON.stringify(itemData),
    }),

  update: (id, itemData) =>
    apiRequest(`/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(itemData),
    }),

  delete: (id) =>
    apiRequest(`/items/${id}`, {
      method: "DELETE",
    }),
};

// Required Items API functions
export const requiredItemsAPI = {
  getAll: () => apiRequest("/required-items"),

  getById: (id) => apiRequest(`/required-items/${id}`),

  create: (itemData) =>
    apiRequest("/required-items", {
      method: "POST",
      body: JSON.stringify(itemData),
    }),

  update: (id, itemData) =>
    apiRequest(`/required-items/${id}`, {
      method: "PUT",
      body: JSON.stringify(itemData),
    }),

  assign: (id, personId) =>
    apiRequest(`/required-items/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ person_id: personId }),
    }),

  delete: (id) =>
    apiRequest(`/required-items/${id}`, {
      method: "DELETE",
    }),
};
