export interface InPostLocker {
  id: string
  name: string
  description: string
  address: {
    line1: string
    line2?: string
    city: string
    postcode: string
    country: string
  }
  location: {
    latitude: number
    longitude: number
  }
  opening_hours: string
  payment_available: boolean
  is_next: boolean
  recommended: boolean
  image_url: string
  status: string
}

export interface InPostLockersResponse {
  lockers: InPostLocker[]
  total: number
}

// Fetch InPost lockers based on location
export async function fetchInPostLockers(params: {
  latitude?: number
  longitude?: number
  city?: string
  postcode?: string
  country_code?: string
  radius?: number
  limit?: number
}): Promise<InPostLockersResponse | null> {
  const requestId = Math.random().toString(36).substring(7)

  try {
    console.log(
      `[InPost-Frontend-${requestId}] Fetching lockers with params:`,
      params
    )

    const queryParams = new URLSearchParams()

    if (params.latitude && params.longitude) {
      queryParams.append("latitude", params.latitude.toString())
      queryParams.append("longitude", params.longitude.toString())
      console.log(
        `[InPost-Frontend-${requestId}] Using GPS coordinates: ${params.latitude}, ${params.longitude}`
      )
    }

    if (params.city) {
      queryParams.append("city", params.city)
      console.log(
        `[InPost-Frontend-${requestId}] Searching by city: ${params.city}`
      )
    }

    if (params.postcode) {
      queryParams.append("postcode", params.postcode)
      console.log(
        `[InPost-Frontend-${requestId}] Searching by postcode: ${params.postcode}`
      )
    }

    if (params.country_code) {
      queryParams.append("country_code", params.country_code)
      console.log(
        `[InPost-Frontend-${requestId}] Country code: ${params.country_code}`
      )
    }

    if (params.radius) queryParams.append("radius", params.radius.toString())
    if (params.limit) queryParams.append("limit", params.limit.toString())

    const baseUrl =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    const url = `${baseUrl}/store/inpost/lockers?${queryParams}`

    console.log(`[InPost-Frontend-${requestId}] Making request to: ${url}`)

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // Add publishable API key if available
    if (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
      headers["x-publishable-api-key"] =
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    })

    console.log(
      `[InPost-Frontend-${requestId}] Response status: ${response.status}`
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[InPost-Frontend-${requestId}] API error:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })

      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }

      console.error(
        `[InPost-Frontend-${requestId}] Failed to fetch InPost lockers:`,
        errorData
      )
      return null
    }

    const data = await response.json()
    console.log(
      `[InPost-Frontend-${requestId}] Successfully received ${
        data.lockers?.length || 0
      } lockers`
    )

    // Validate the response structure
    if (!data.lockers || !Array.isArray(data.lockers)) {
      console.error(
        `[InPost-Frontend-${requestId}] Invalid response structure:`,
        data
      )
      return null
    }

    // Log sample locker data for debugging
    if (data.lockers.length > 0) {
      console.log(`[InPost-Frontend-${requestId}] Sample locker:`, {
        id: data.lockers[0].id,
        name: data.lockers[0].name,
        city: data.lockers[0].address?.city,
        status: data.lockers[0].status,
      })
    }

    return data
  } catch (error: any) {
    console.error(
      `[InPost-Frontend-${requestId}] Error fetching InPost lockers:`,
      {
        message: error.message,
        stack: error.stack,
        params,
      }
    )
    return null
  }
}

// Get user's current location
export const getCurrentLocation = (): Promise<{
  latitude: number
  longitude: number
} | null> => {
  const requestId = Math.random().toString(36).substring(7)

  return new Promise((resolve) => {
    console.log(`[InPost-Location-${requestId}] Requesting user location`)

    if (!navigator.geolocation) {
      console.warn(
        `[InPost-Location-${requestId}] Geolocation not supported by browser`
      )
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        console.log(`[InPost-Location-${requestId}] Location obtained:`, coords)
        resolve(coords)
      },
      (error) => {
        console.error(`[InPost-Location-${requestId}] Location error:`, {
          code: error.code,
          message: error.message,
        })
        resolve(null)
      },
      {
        timeout: 10000,
        enableHighAccuracy: false,
        maximumAge: 60000,
      }
    )
  })
}
