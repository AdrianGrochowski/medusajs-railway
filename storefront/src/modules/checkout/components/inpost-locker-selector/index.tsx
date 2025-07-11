"use client"

import { useEffect, useState, useRef } from "react"
import { Button, Text, clx } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"

// InPost GeoWidget types
declare global {
  interface Window {
    easyPack: {
      init: (config: {
        instance: string
        apiEndpoint: string
        geoWidgetConfig: {
          map: {
            initialTypes: string[]
            visibleTypes: string[]
            initialCountry: string
            initialCoordinates: [number, number]
            zoomLevel: number
            autoCenter: boolean
            mapType: string
            points: {
              types: string[]
              functions: string[]
            }
          }
          searchBar: {
            enabled: boolean
            placeholder: string
          }
          filters: {
            enabled: boolean
            showUnavailable: boolean
            showDeliveryTypes: boolean
            showPaymentTypes: boolean
            showServices: boolean
            showPop: boolean
            showParcel: boolean
            showLetters: boolean
            showAll: boolean
          }
          callback: (point: any) => void
          width: string
          height: string
          cssClass: string
          osm: boolean
          language: string
          country: string
          searchType: string
          dropdownCSSClass: string
          dropdownParentCSSClass: string
        }
      }) => void
    }
  }
}

interface InPostLockerSelectorProps {
  cart: HttpTypes.StoreCart
  onLockerSelect: (locker: InPostLocker) => void
  selectedLocker?: InPostLocker | null
}

interface InPostLocker {
  name: string
  address: {
    line1: string
    line2?: string
    city: string
    postal_code: string
    country_code: string
  }
  coordinates: [number, number]
  status: string
  description?: string
}

const InPostLockerSelector: React.FC<InPostLockerSelectorProps> = ({
  cart,
  onLockerSelect,
  selectedLocker,
}) => {
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Load InPost GeoWidget script
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://geowidget.inpost.pl/inpost-geowidget.js"
    script.async = true
    script.onload = () => {
      setIsScriptLoaded(true)
    }
    script.onerror = () => {
      setError("Failed to load InPost GeoWidget script")
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // Initialize GeoWidget when script is loaded
  useEffect(() => {
    if (isScriptLoaded && mapContainerRef.current && !isMapLoaded) {
      initializeGeoWidget()
    }
  }, [isScriptLoaded, isMapLoaded])

  const initializeGeoWidget = () => {
    if (!window.easyPack) {
      setError("InPost GeoWidget is not available")
      return
    }

    try {
      // Get initial coordinates based on shipping address
      const initialCoordinates: [number, number] = getInitialCoordinates()

      window.easyPack.init({
        instance: "inpost-geowidget",
        apiEndpoint: "https://api-pl.easypack24.net/v1",
        geoWidgetConfig: {
          map: {
            initialTypes: ["parcel_locker"],
            visibleTypes: ["parcel_locker"],
            initialCountry: "pl",
            initialCoordinates,
            zoomLevel: 12,
            autoCenter: true,
            mapType: "osm",
            points: {
              types: ["parcel_locker"],
              functions: ["parcel_collect"],
            },
          },
          searchBar: {
            enabled: true,
            placeholder: "Wpisz adres lub kod pocztowy",
          },
          filters: {
            enabled: true,
            showUnavailable: false,
            showDeliveryTypes: false,
            showPaymentTypes: false,
            showServices: false,
            showPop: false,
            showParcel: true,
            showLetters: false,
            showAll: false,
          },
          callback: handleLockerSelection,
          width: "100%",
          height: "400px",
          cssClass: "inpost-geowidget-checkout",
          osm: true,
          language: "pl",
          country: "pl",
          searchType: "proximity",
          dropdownCSSClass: "inpost-dropdown",
          dropdownParentCSSClass: "inpost-dropdown-parent",
        },
      })

      setIsMapLoaded(true)
    } catch (err) {
      setError("Failed to initialize InPost GeoWidget")
      console.error("InPost GeoWidget initialization error:", err)
    }
  }

  const getInitialCoordinates = (): [number, number] => {
    // Default to Warsaw coordinates if no shipping address
    let defaultCoordinates: [number, number] = [52.2297, 21.0122]

    if (cart.shipping_address) {
      const { city, postal_code } = cart.shipping_address

      // You could implement geocoding here based on the shipping address
      // For now, we'll use the default coordinates

      return defaultCoordinates
    }

    return defaultCoordinates
  }

  const handleLockerSelection = (point: any) => {
    try {
      const locker: InPostLocker = {
        name: point.name,
        address: {
          line1: point.address_details?.street || point.address?.line1 || "",
          line2: point.address_details?.building_number || "",
          city: point.address_details?.city || point.address?.city || "",
          postal_code:
            point.address_details?.post_code ||
            point.address?.postal_code ||
            "",
          country_code: "pl",
        },
        coordinates: [
          point.location?.latitude || 0,
          point.location?.longitude || 0,
        ],
        status: point.status || "unknown",
        description: point.location_description || "",
      }

      onLockerSelect(locker)
    } catch (err) {
      console.error("Error processing locker selection:", err)
      setError("Failed to process locker selection")
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <Text className="text-red-800 font-medium">
          Error loading locker selector
        </Text>
        <Text className="text-red-600 text-sm mt-1">{error}</Text>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <Text className="text-base font-medium">Wybierz Paczkomat InPost</Text>
        {selectedLocker && (
          <Text className="text-sm text-green-600">
            Wybrany: {selectedLocker.name}
          </Text>
        )}
      </div>

      {selectedLocker && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <Text className="font-medium text-green-800">
            {selectedLocker.name}
          </Text>
          <Text className="text-sm text-green-700">
            {selectedLocker.address.line1} {selectedLocker.address.line2}
          </Text>
          <Text className="text-sm text-green-700">
            {selectedLocker.address.postal_code} {selectedLocker.address.city}
          </Text>
          {selectedLocker.description && (
            <Text className="text-sm text-green-600 mt-1">
              {selectedLocker.description}
            </Text>
          )}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div
          ref={mapContainerRef}
          id="inpost-geowidget"
          className={clx(
            "w-full h-96 bg-gray-100 flex items-center justify-center",
            {
              "animate-pulse": !isMapLoaded && !error,
            }
          )}
        >
          {!isMapLoaded && !error && (
            <Text className="text-gray-600">Ładowanie mapy...</Text>
          )}
        </div>
      </div>

      {!selectedLocker && (
        <Text className="text-sm text-gray-600">
          Kliknij na mapie, aby wybrać Paczkomat InPost
        </Text>
      )}
    </div>
  )
}

export default InPostLockerSelector
