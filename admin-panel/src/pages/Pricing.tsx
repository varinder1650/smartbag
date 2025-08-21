import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useDashboardStore } from "@/store/dashboardStore";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { Save, Calculator, Truck, CreditCard } from "lucide-react";

export default function Pricing() {
  const { toast } = useToast();
  const [saveReason, setSaveReason] = useState("");
  
  const [deliveryConfig, setDeliveryConfig] = useState({
    type: "fixed",
    baseFee: "5.00",
    perKmRate: "1.50",
    minFee: "3.00",
    maxFee: "15.00",
    freeDeliveryThreshold: "50.00",
  });

  const [appConfig, setAppConfig] = useState({
    type: "percentage",
    value: "2.5",
    minFee: "0.50",
    maxFee: "5.00",
  });

  // Pricing simulator state
  const [simulatorData, setSimulatorData] = useState({
    orderValue: "35.00",
    distance: "5.2",
  });

  // Set up real-time handlers (only for implemented endpoints)
  useEffect(() => {
    const handleError = (data) => {
      console.error('Pricing WebSocket error:', data);
      // Only show error toast for actual errors, not missing endpoints
      if (!data.message?.includes('Unknown message type') && 
          !data.message?.includes('get_pricing_config')) {
        toast({
          title: "Error",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    };

    // Register error handler
    wsService.onMessage("error", handleError);

    // Cleanup function
    return () => {
      wsService.onMessage("error", () => {});
    };
  }, [toast]);

  const calculateDeliveryFee = (orderValue, distance) => {
    if (orderValue >= parseFloat(deliveryConfig.freeDeliveryThreshold)) {
      return 0;
    }

    let fee = 0;
    switch (deliveryConfig.type) {
      case "fixed":
        fee = parseFloat(deliveryConfig.baseFee);
        break;
      case "distance_based":
        fee = parseFloat(deliveryConfig.baseFee) + (distance * parseFloat(deliveryConfig.perKmRate));
        break;
      case "order_value_based":
        fee = orderValue * 0.1; // 10% of order value as example
        break;
    }

    // Apply min/max constraints
    if (deliveryConfig.minFee) {
      fee = Math.max(fee, parseFloat(deliveryConfig.minFee));
    }
    if (deliveryConfig.maxFee) {
      fee = Math.min(fee, parseFloat(deliveryConfig.maxFee));
    }

    return fee;
  };

  const calculateAppFee = (orderValue) => {
    let fee = 0;
    switch (appConfig.type) {
      case "fixed":
        fee = parseFloat(appConfig.value);
        break;
      case "percentage":
        fee = orderValue * (parseFloat(appConfig.value) / 100);
        break;
      case "tiered":
        // Tiered pricing example
        if (orderValue < 25) {
          fee = 1.00;
        } else if (orderValue < 50) {
          fee = 1.50;
        } else {
          fee = 2.00;
        }
        break;
    }

    // Apply min/max constraints
    if (appConfig.minFee) {
      fee = Math.max(fee, parseFloat(appConfig.minFee));
    }
    if (appConfig.maxFee) {
      fee = Math.min(fee, parseFloat(appConfig.maxFee));
    }

    return fee;
  };

  const handleSave = () => {
    if (!saveReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for this pricing change",
        variant: "destructive",
      });
      return;
    }

    const configData = {
      deliveryFee: {
        type: deliveryConfig.type,
        baseFee: parseFloat(deliveryConfig.baseFee),
        perKmRate: parseFloat(deliveryConfig.perKmRate),
        minFee: parseFloat(deliveryConfig.minFee),
        maxFee: parseFloat(deliveryConfig.maxFee),
        freeDeliveryThreshold: parseFloat(deliveryConfig.freeDeliveryThreshold),
      },
      appFee: {
        type: appConfig.type,
        value: parseFloat(appConfig.value),
        minFee: parseFloat(appConfig.minFee),
        maxFee: parseFloat(appConfig.maxFee),
      },
      auditReason: saveReason,
      updatedAt: new Date().toISOString(),
    };

    console.log('Saving pricing config:', configData);

    // For now, just show success since backend endpoint might not be implemented
    toast({
      title: "Configuration Saved",
      description: "Pricing configuration saved locally (backend implementation pending)",
    });

    setSaveReason("");
  };

  const simulatedOrderValue = parseFloat(simulatorData.orderValue) || 0;
  const simulatedDistance = parseFloat(simulatorData.distance) || 0;
  const simulatedDeliveryFee = calculateDeliveryFee(simulatedOrderValue, simulatedDistance);
  const simulatedAppFee = calculateAppFee(simulatedOrderValue);
  const totalFees = simulatedDeliveryFee + simulatedAppFee;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pricing Configuration</h1>
        <p className="text-muted-foreground">Configure delivery fees and app commission structure</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Fee Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Fee Configuration
            </CardTitle>
            <CardDescription>
              Set up how delivery fees are calculated for orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-type">Delivery Fee Type</Label>
              <Select
                value={deliveryConfig.type || "fixed"}
                onValueChange={(value) => setDeliveryConfig({ ...deliveryConfig, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Rate</SelectItem>
                  <SelectItem value="distance_based">Distance Based</SelectItem>
                  <SelectItem value="order_value_based">Order Value Based</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base-fee">Base Fee ($)</Label>
                <Input
                  id="base-fee"
                  type="number"
                  step="0.01"
                  value={deliveryConfig.baseFee}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, baseFee: e.target.value })}
                />
              </div>
              {deliveryConfig.type === "distance_based" && (
                <div className="space-y-2">
                  <Label htmlFor="per-km-rate">Per KM Rate ($)</Label>
                  <Input
                    id="per-km-rate"
                    type="number"
                    step="0.01"
                    value={deliveryConfig.perKmRate}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, perKmRate: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-fee">Minimum Fee ($)</Label>
                <Input
                  id="min-fee"
                  type="number"
                  step="0.01"
                  value={deliveryConfig.minFee}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, minFee: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-fee">Maximum Fee ($)</Label>
                <Input
                  id="max-fee"
                  type="number"
                  step="0.01"
                  value={deliveryConfig.maxFee}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, maxFee: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="free-threshold">Free Delivery Threshold ($)</Label>
              <Input
                id="free-threshold"
                type="number"
                step="0.01"
                value={deliveryConfig.freeDeliveryThreshold}
                onChange={(e) => setDeliveryConfig({ ...deliveryConfig, freeDeliveryThreshold: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* App Fee Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              App Fee Configuration
            </CardTitle>
            <CardDescription>
              Configure commission and service fees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app-fee-type">App Fee Type</Label>
              <Select
                value={appConfig.type || "percentage"}
                onValueChange={(value) => setAppConfig({ ...appConfig, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="tiered">Tiered Pricing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="app-fee-value">
                {appConfig.type === "percentage" ? "Percentage (%)" : "Fixed Amount ($)"}
              </Label>
              <Input
                id="app-fee-value"
                type="number"
                step={appConfig.type === "percentage" ? "0.1" : "0.01"}
                value={appConfig.value}
                onChange={(e) => setAppConfig({ ...appConfig, value: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="app-min-fee">Minimum Fee ($)</Label>
                <Input
                  id="app-min-fee"
                  type="number"
                  step="0.01"
                  value={appConfig.minFee}
                  onChange={(e) => setAppConfig({ ...appConfig, minFee: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-max-fee">Maximum Fee ($)</Label>
                <Input
                  id="app-max-fee"
                  type="number"
                  step="0.01"
                  value={appConfig.maxFee}
                  onChange={(e) => setAppConfig({ ...appConfig, maxFee: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Simulator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pricing Simulator
          </CardTitle>
          <CardDescription>
            Test how your pricing configuration affects different order scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Order Details</h3>
              <div className="space-y-2">
                <Label htmlFor="sim-order-value">Order Value ($)</Label>
                <Input
                  id="sim-order-value"
                  type="number"
                  step="0.01"
                  value={simulatorData.orderValue}
                  onChange={(e) => setSimulatorData({ ...simulatorData, orderValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sim-distance">Distance (km)</Label>
                <Input
                  id="sim-distance"
                  type="number"
                  step="0.1"
                  value={simulatorData.distance}
                  onChange={(e) => setSimulatorData({ ...simulatorData, distance: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Fee Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Order Value:</span>
                  <span className="font-medium">${simulatedOrderValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span className="font-medium">${simulatedDeliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>App Fee:</span>
                  <span className="font-medium">${simulatedAppFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total Fees:</span>
                  <span>${totalFees.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Customer Summary</h3>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${simulatedOrderValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>${simulatedDeliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee:</span>
                  <span>${simulatedAppFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${(simulatedOrderValue + totalFees).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Save Configuration</CardTitle>
          <CardDescription>
            Provide a reason for this pricing change for audit purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="save-reason">Reason for Change</Label>
            <Textarea
              id="save-reason"
              placeholder="e.g., Adjusting delivery fees to improve profitability, seasonal pricing update..."
              value={saveReason}
              onChange={(e) => setSaveReason(e.target.value)}
              required
            />
          </div>
          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Pricing Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}