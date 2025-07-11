"use client"

import { RadioGroup } from "@headlessui/react"
import { CheckCircleSolid } from "@medusajs/icons"
import { Button, Heading, Text, clx } from "@medusajs/ui"

import Divider from "@modules/common/components/divider"
import Radio from "@modules/common/components/radio"
import ErrorMessage from "@modules/checkout/components/error-message"
import InPostLockerSelector from "@modules/checkout/components/inpost-locker-selector"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { setShippingMethod, setInPostLocker } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
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

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocker, setSelectedLocker] = useState<InPostLocker | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const selectedShippingMethod = availableShippingMethods?.find(
    // To do: remove the previously selected shipping method instead of using the last one
    (method) => method.id === cart.shipping_methods?.at(-1)?.shipping_option_id
  )

  // Check if InPost is selected
  const isInPostSelected = selectedShippingMethod?.name?.toLowerCase().includes("inpost") || 
                          selectedShippingMethod?.name?.toLowerCase().includes("paczkomaty")

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = async () => {
    // If InPost is selected, ensure a locker is chosen
    if (isInPostSelected && !selectedLocker) {
      setError("Please select an InPost locker to continue")
      return
    }

    // Save InPost locker data if selected
    if (isInPostSelected && selectedLocker) {
      try {
        await setInPostLocker({
          cartId: cart.id,
          lockerData: {
            target_point: selectedLocker.name,
            point_name: selectedLocker.name,
            point_address: selectedLocker.address,
          },
        })
      } catch (err: any) {
        setError("Failed to save locker selection: " + err.message)
        return
      }
    }

    router.push(pathname + "?step=payment", { scroll: false })
  }

  const set = async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      
      // Reset locker selection when changing shipping method
      setSelectedLocker(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLockerSelect = (locker: InPostLocker) => {
    setSelectedLocker(locker)
    setError(null) // Clear any previous errors
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  // Check if user can continue (has shipping method and locker if InPost)
  const canContinue = cart.shipping_methods?.length > 0 && 
                     (!isInPostSelected || selectedLocker)

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && cart.shipping_methods?.length === 0,
            }
          )}
        >
          Delivery
          {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && (
            <CheckCircleSolid />
          )}
        </Heading>
        {!isOpen &&
          cart?.shipping_address &&
          cart?.billing_address &&
          cart?.email && (
            <Text>
              <button
                onClick={handleEdit}
                className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                data-testid="edit-delivery-button"
              >
                Edit
              </button>
            </Text>
          )}
      </div>
      {isOpen ? (
        <div data-testid="delivery-options-container">
          <div className="pb-8">
            <RadioGroup value={selectedShippingMethod?.id} onChange={set}>
              {availableShippingMethods?.map((option) => {
                return (
                  <RadioGroup.Option
                    key={option.id}
                    value={option.id}
                    data-testid="delivery-option-radio"
                    className={clx(
                      "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                      {
                        "border-ui-border-interactive":
                          option.id === selectedShippingMethod?.id,
                      }
                    )}
                  >
                    <div className="flex items-center gap-x-4">
                      <Radio
                        checked={option.id === selectedShippingMethod?.id}
                      />
                      <span className="text-base-regular">{option.name}</span>
                    </div>
                    <span className="justify-self-end text-ui-fg-base">
                      {convertToLocale({
                        amount: option.amount!,
                        currency_code: cart?.currency_code,
                      })}
                    </span>
                  </RadioGroup.Option>
                )
              })}
            </RadioGroup>
          </div>

          {/* InPost Locker Selector */}
          {isInPostSelected && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <Text className="text-blue-800 font-medium mb-2">
                  Select InPost Locker
                </Text>
                <Text className="text-blue-600 text-sm">
                  Please choose a Paczkomat where you'd like to collect your package.
                </Text>
              </div>
              
              <InPostLockerSelector
                cart={cart}
                onLockerSelect={handleLockerSelect}
                selectedLocker={selectedLocker}
              />
              
              {selectedLocker && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Text className="text-green-800 font-medium">
                    Selected Locker: {selectedLocker.name}
                  </Text>
                  <Text className="text-green-600 text-sm">
                    {selectedLocker.address.line1}, {selectedLocker.address.city}
                  </Text>
                </div>
              )}
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="delivery-option-error-message"
          />

          <Button
            size="large"
            className="mt-6"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!canContinue}
            data-testid="submit-delivery-option-button"
          >
            Continue to payment
          </Button>
        </div>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && (cart.shipping_methods?.length ?? 0) > 0 && (
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Method
                </Text>
                <Text className="txt-medium text-ui-fg-subtle">
                  {selectedShippingMethod?.name}{" "}
                  {convertToLocale({
                    amount: selectedShippingMethod?.amount!,
                    currency_code: cart?.currency_code,
                  })}
                </Text>
                {isInPostSelected && selectedLocker && (
                  <Text className="txt-small text-ui-fg-subtle mt-1">
                    Locker: {selectedLocker.name}
                  </Text>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Shipping
