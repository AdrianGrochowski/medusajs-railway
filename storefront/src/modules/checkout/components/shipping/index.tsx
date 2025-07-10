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
import { setShippingMethod } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { InPostLocker } from "@lib/data/inpost"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocker, setSelectedLocker] = useState<InPostLocker | null>(
    null
  )
  const [pendingShippingMethodId, setPendingShippingMethodId] = useState<
    string | null
  >(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const selectedShippingMethod = availableShippingMethods?.find(
    // To do: remove the previously selected shipping method instead of using the last one
    (method) => method.id === cart.shipping_methods?.at(-1)?.shipping_option_id
  )

  // Check if the selected shipping method is InPost
  const isInPostLocker =
    selectedShippingMethod?.name?.toLowerCase().includes("inpost") ||
    selectedShippingMethod?.provider_id?.includes("inpost")

  // Check if pending method (user clicked but not confirmed) is InPost
  const pendingMethod = availableShippingMethods?.find(
    (method) => method.id === pendingShippingMethodId
  )
  const isPendingInPost =
    pendingMethod?.name?.toLowerCase().includes("inpost") ||
    pendingMethod?.provider_id?.includes("inpost")

  // Show locker selector if either selected or pending method is InPost
  const shouldShowLockerSelector = isInPostLocker || isPendingInPost

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    // Check if there's a pending InPost selection
    if (pendingShippingMethodId) {
      setError("Please confirm your InPost locker selection first.")
      return
    }

    // Validate InPost locker selection
    if (isInPostLocker && !selectedLocker) {
      setError("Please select an InPost locker before continuing.")
      return
    }
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const set = async (id: string) => {
    const requestId = Math.random().toString(36).substring(7)

    console.log(`[Shipping-${requestId}] Setting shipping method:`, {
      methodId: id,
      cartId: cart.id,
      selectedLocker: selectedLocker?.id || null,
    })

    setIsLoading(true)
    setError(null)

    // Check if this is an InPost locker method
    const selectedMethod = availableShippingMethods?.find(
      (method) => method.id === id
    )
    const isInPostMethod =
      selectedMethod?.name?.toLowerCase().includes("inpost") ||
      selectedMethod?.provider_id?.includes("inpost")

    console.log(`[Shipping-${requestId}] Method analysis:`, {
      methodName: selectedMethod?.name,
      isInPostMethod,
      hasSelectedLocker: !!selectedLocker,
    })

    try {
      // Validate InPost locker selection before attempting to set shipping method
      if (isInPostMethod && !selectedLocker) {
        console.warn(
          `[Shipping-${requestId}] InPost method selected but no locker chosen`
        )
        setError(
          "Please select an InPost locker before choosing this shipping method."
        )
        setIsLoading(false)
        return
      }

      // Prepare additional data if InPost locker method is selected
      let additionalData = undefined
      if (isInPostMethod && selectedLocker) {
        additionalData = {
          locker_id: selectedLocker.id,
          locker_name: selectedLocker.name,
          locker_address: selectedLocker.address,
        }
        console.log(
          `[Shipping-${requestId}] Using InPost locker data:`,
          additionalData
        )
      }

      console.log(`[Shipping-${requestId}] Calling setShippingMethod...`)
      await setShippingMethod({
        cartId: cart.id,
        shippingMethodId: id,
        data: additionalData,
      })

      console.log(`[Shipping-${requestId}] Shipping method set successfully`)
    } catch (err: any) {
      console.error(`[Shipping-${requestId}] Error setting shipping method:`, {
        error: err.message,
        stack: err.stack,
        methodId: id,
        isInPostMethod,
        hasLocker: !!selectedLocker,
      })
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLockerSelect = (locker: InPostLocker | null) => {
    setSelectedLocker(locker)
    setError(null)
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  // Reset locker selection when switching away from InPost locker
  useEffect(() => {
    if (!isInPostLocker) {
      setSelectedLocker(null)
    }
  }, [isInPostLocker])

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
            <RadioGroup
              value={selectedShippingMethod?.id}
              onChange={(id: string) => {
                setPendingShippingMethodId(id)
                // Check if this is InPost method
                const method = availableShippingMethods?.find(
                  (m) => m.id === id
                )
                const isInPost =
                  method?.name?.toLowerCase().includes("inpost") ||
                  method?.provider_id?.includes("inpost")

                // If not InPost, immediately set the shipping method
                if (!isInPost) {
                  set(id)
                  setPendingShippingMethodId(null)
                }
              }}
            >
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
          {shouldShowLockerSelector && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <InPostLockerSelector
                onLockerSelect={handleLockerSelect}
                selectedLocker={selectedLocker}
                shippingAddress={
                  cart.shipping_address
                    ? {
                        city: cart.shipping_address.city || undefined,
                        postal_code:
                          cart.shipping_address.postal_code || undefined,
                        country_code:
                          cart.shipping_address.country_code || undefined,
                      }
                    : undefined
                }
              />

              {/* Confirm InPost Selection Button */}
              {pendingShippingMethodId && selectedLocker && (
                <div className="mt-4">
                  <Button
                    onClick={() => {
                      set(pendingShippingMethodId)
                      setPendingShippingMethodId(null)
                    }}
                    className="w-full"
                    disabled={isLoading}
                  >
                    Confirm InPost Locker Selection
                  </Button>
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
            disabled={
              !cart.shipping_methods?.[0] ||
              (isInPostLocker && !selectedLocker) ||
              pendingShippingMethodId !== null
            }
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
                {/* Show selected locker info */}
                {isInPostLocker && selectedLocker && (
                  <Text className="txt-small text-ui-fg-subtle mt-1">
                    Locker: {selectedLocker.name} -{" "}
                    {selectedLocker.address.city}
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
