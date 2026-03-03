/**
 * @module ResSummaryStep — Step 8 (Residential)
 * Pricing summary, custom price override, discount toggle.
 */
import { Users, Info, Tag, Percent, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Button } from "@/shared/components/ui/button";
import type { ResidentialPricingOutput } from "../../hooks/useResidentialPricing";
import { toDecimalString } from "@/shared/utils/numericInput";

interface ClientInfo {
  name:    string;
  email:   string;
  phone:   string;
  address: string;
  city:    string;
  state:   string;
  zip:     string;
}

export interface ResSummaryStepProps {
  pricing:        ResidentialPricingOutput;
  selectedService: string;
  client:         ClientInfo | null;
  useCustomPrice: boolean;
  customPrice:    string;
  applyDiscount:  boolean;
  discountType:   "percentage" | "amount";
  discountValue:  string;
  onUseCustomPriceChange: (v: boolean) => void;
  onCustomPriceChange:    (v: string) => void;
  onApplyDiscountChange:  (v: boolean) => void;
  onDiscountTypeChange:   (v: "percentage" | "amount") => void;
  onDiscountValueChange:  (v: string) => void;
}

export function ResSummaryStep({
  pricing, selectedService, client,
  useCustomPrice, customPrice, applyDiscount, discountType, discountValue,
  onUseCustomPriceChange, onCustomPriceChange,
  onApplyDiscountChange, onDiscountTypeChange, onDiscountValueChange,
}: ResSummaryStepProps) {
  const { total, laborCost, suppliesCost, overheadCost, totalOpCost, netProfit, crewPlanning } = pricing;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Estimate Summary</h2>

      {client && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-1">{client.name}</p>
            <p className="text-xs text-muted-foreground">{client.email} • {client.phone}</p>
            <p className="text-xs text-muted-foreground">
              {client.address}, {client.city}, {client.state} {client.zip}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Total */}
      <Card style={{ borderColor: "hsl(var(--primary))" }} className="border-2">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-4xl font-bold text-primary">${total.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Service: {selectedService}</p>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Operation Cost Breakdown</h4>
          {[
            { label: "Labor Cost",          val: laborCost    },
            { label: "Supplies & Materials", val: suppliesCost },
            { label: "Overhead",             val: overheadCost },
          ].map(({ label, val }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">${val.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between text-sm font-semibold">
            <span>Total Operating Cost</span>
            <span>${totalOpCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold" style={{ color: "hsl(var(--green-vibrant))" }}>
            <span>Net Profit</span>
            <span>${netProfit.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Crew Planning */}
      {selectedService !== "Post Construction" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Crew Planning
            </h4>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Recommended Crew Size</span>
              <span className="font-medium">
                {crewPlanning.crewSize} {crewPlanning.crewSize === 1 ? "cleaner" : "cleaners"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated Time per Person</span>
              <span className="font-medium">{crewPlanning.hours}h {crewPlanning.minutes}m</span>
            </div>
            <div className="flex gap-2 rounded-lg border border-info-subtle-border bg-info-subtle/50 p-3">
              <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
              <p className="text-xs text-info-subtle-foreground">
                This recommendation is based on the property size, number of rooms, and additional services.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Price */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Custom Price
          </h4>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Do you want to change the price?</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">No</span>
              <Switch checked={useCustomPrice} onCheckedChange={onUseCustomPriceChange} />
              <span className="text-xs text-muted-foreground">Yes</span>
            </div>
          </div>

          {useCustomPrice && (
            <>
              <div className="space-y-2">
                <Label htmlFor="customPrice">Custom Total Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="customPrice"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={customPrice}
                    onChange={(e) => onCustomPriceChange(toDecimalString(e.target.value))}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="flex gap-2 rounded-lg border border-warning-subtle-border bg-warning-subtle/50 p-3">
                <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning-subtle-foreground">
                  Setting a custom price will override the calculated total, this price will be used in the final estimate
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Discount */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Discount
          </h4>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Do you want to apply a discount?</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">No</span>
              <Switch checked={applyDiscount} onCheckedChange={onApplyDiscountChange} />
              <span className="text-xs text-muted-foreground">Yes</span>
            </div>
          </div>

          {applyDiscount && (
            <>
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={discountType === "percentage" ? "default" : "outline"}
                    onClick={() => onDiscountTypeChange("percentage")}
                    className="w-full"
                  >
                    <Percent className="h-4 w-4 mr-2" />
                    Percentage
                  </Button>
                  <Button
                    type="button"
                    variant={discountType === "amount" ? "default" : "outline"}
                    onClick={() => onDiscountTypeChange("amount")}
                    className="w-full"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Amount
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {discountType === "percentage" ? "Discount Percentage" : "Discount Amount"}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {discountType === "percentage" ? "%" : "$"}
                  </span>
                  <Input
                    id="discountValue"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={discountValue}
                    onChange={(e) => onDiscountValueChange(toDecimalString(e.target.value))}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="flex gap-2 rounded-lg border border-info-subtle-border bg-info-subtle/50 p-3">
                <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
                <p className="text-xs text-info-subtle-foreground">
                  The discount will be applied to the final price and will affect the net profit calculation
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
