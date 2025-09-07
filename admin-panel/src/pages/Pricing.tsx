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
import { Save, Calculator, Truck, CreditCard, Loader2, RefreshCw } from "lucide-react";

interface PricingConfig {
  delivery_fee: {
    type: string;
    base_fee: number;
    per_km_rate: number;
    min_fee: number;
    max_fee: number;
    free_delivery_threshold: number;
  };
  appFee: {
    type: string;
    value: number;
    min_fee: number;
    max_fee: number;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export default function Pricing() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [deliveryConfig, setDeliveryConfig] = useState({
    type: "fixed",
    base_fee: "5.00",          
    per_km_rate: "1.50",       
    min_fee: "3.00",           
    max_fee: "15.00",          
    free_delivery_threshold: "50.00", 
  });
  
  const [appConfig, setAppConfig] = useState({
    type: "percentage",
    value: "2.5", 
    min_fee: "0.50",           
    max_fee: "5.00",           
  });

  // Pricing simulator state
  const [simulatorData, setSimulatorData] = useState({
    orderValue: "35.00",
    distance: "5.2",
  });

  // Load existing pricing configuration on component mount
  useEffect(() => {
    console.log('Pricing component mounted, requesting pricing config...');
    
    wsService.send({
      type: 'get_pricing_config'
    });

    const handlePricingConfigData = (data: any) => {
      console.log('Received pricing config data:', data);
      const config = data.data || {};
  
      if (config.delivery_fee) {
        setDeliveryConfig({
          type: config.delivery_fee.type || "fixed",
          base_fee: config.delivery_fee.base_fee?.toString(),
          per_km_rate: config.delivery_fee.per_km_rate?.toString(),
          min_fee: config.delivery_fee.min_fee?.toString(),
          max_fee: config.delivery_fee.max_fee?.toString(),
          free_delivery_threshold: config.delivery_fee.free_delivery_threshold?.toString(),
        });
      }
      
      if (config.app_fee) {
        setAppConfig({
          type: config.app_fee.type || "percentage",
          value: config.app_fee.value?.toString(),
          min_fee: config.app_fee.min_fee?.toString(),
          max_fee: config.app_fee.max_fee?.toString(),
        });
      }
      
      setIsLoading(false);
    };

    const handlePricingConfigSaved = (data: any) => {
      console.log('Pricing config saved:', data);
      setIsSaving(false);
      toast({
        title: "Configuration Saved",
        description: "Pricing configuration has been saved successfully to the database",
      });
    };

    const handleError = (data: any) => {
      console.error('Pricing WebSocket error:', data);
      setIsLoading(false);
      setIsSaving(false);
      
      if (!data.message?.includes('Unknown message type') && 
          !data.message?.includes('get_pricing_config')) {
        toast({
          title: "Error",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    };

    // Register message handlers
    wsService.onMessage("pricing_config", handlePricingConfigData); // Your backend sends "pricing_config"
    wsService.onMessage("pricing_config_data", handlePricingConfigData); // Fallback
    wsService.onMessage("pricing_updated", handlePricingConfigSaved); // Your backend sends "pricing_updated"
    wsService.onMessage("pricing_config_saved", handlePricingConfigSaved); // Fallback
    wsService.onMessage("error", handleError);

    // Cleanup function
    return () => {
      wsService.onMessage("pricing_config", () => {});
      wsService.onMessage("pricing_config_data", () => {});
      wsService.onMessage("pricing_updated", () => {});
      wsService.onMessage("pricing_config_saved", () => {});
      wsService.onMessage("error", () => {});
    };
  }, [toast]);

  const calculateDeliveryFee = (orderValue: number, distance: number) => {
    if (orderValue >= parseFloat(deliveryConfig.free_delivery_threshold)) { // Changed
      return 0;
    }
  
    let fee = 0;
    switch (deliveryConfig.type) {
      case "fixed":
        fee = parseFloat(deliveryConfig.base_fee); // Changed from base_fee
        break;
      case "distance_based":
        fee = parseFloat(deliveryConfig.base_fee) + (distance * parseFloat(deliveryConfig.per_km_rate)); // Changed
        break;
      case "order_value_based":
        fee = orderValue * 0.1;
        break;
    }
  
    // Apply min/max constraints
    if (deliveryConfig.min_fee) { // Changed from min_fee
      fee = Math.max(fee, parseFloat(deliveryConfig.min_fee));
    }
    if (deliveryConfig.max_fee) { // Changed from max_fee
      fee = Math.min(fee, parseFloat(deliveryConfig.max_fee));
    }
  
    return fee;
  };
  
  const calculateAppFee = (orderValue: number) => {
    let fee = 0;
    switch (appConfig.type) {
      case "fixed":
        fee = parseFloat(appConfig.value);
        break;
      case "percentage":
        fee = orderValue * (parseFloat(appConfig.value) / 100);
        break;
      case "tiered":
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
    if (appConfig.min_fee) { // Changed from min_fee
      fee = Math.max(fee, parseFloat(appConfig.min_fee));
    }
    if (appConfig.max_fee) { // Changed from max_fee
      fee = Math.min(fee, parseFloat(appConfig.max_fee));
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

    const configData: PricingConfig = {
      delivery_fee: {
        type: deliveryConfig.type,
        base_fee: parseFloat(deliveryConfig.base_fee),
        per_km_rate: parseFloat(deliveryConfig.per_km_rate),
        min_fee: parseFloat(deliveryConfig.min_fee),
        max_fee: parseFloat(deliveryConfig.max_fee),
        free_delivery_threshold: parseFloat(deliveryConfig.free_delivery_threshold),
      },
      appFee: {
        type: appConfig.type,
        value: parseFloat(appConfig.value),
        min_fee: parseFloat(appConfig.min_fee),
        max_fee: parseFloat(appConfig.max_fee),
      },
      updatedAt: new Date().toISOString(),
    };

    console.log('Saving pricing config:', configData);
    setIsSaving(true);

    wsService.send({
      type: 'save_pricing_config',
      data: {
        config: configData,
        auditReason: saveReason
      }
    });

    toast({
      title: "Saving Configuration",
      description: "Saving pricing configuration to database...",
    });
  };

  const handleRefreshConfig = () => {
    setIsLoading(true);
    wsService.send({
      type: 'get_pricing_config'
    });
    
    toast({
      title: "Refreshing Configuration",
      description: "Loading latest pricing configuration...",
    });
  };

  const simulatedOrderValue = parseFloat(simulatorData.orderValue) || 0;
  const simulatedDistance = parseFloat(simulatorData.distance) || 0;
  const simulatedDeliveryFee = calculateDeliveryFee(simulatedOrderValue, simulatedDistance);
  const simulatedAppFee = calculateAppFee(simulatedOrderValue);
  const totalFees = simulatedDeliveryFee + simulatedAppFee;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pricing Configuration</h1>
          <p className="text-muted-foreground">Configure delivery fees and app commission structure</p>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading pricing configuration...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pricing Configuration</h1>
          <p className="text-muted-foreground">Configure delivery fees and app commission structure</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefreshConfig}
          disabled={isLoading || isSaving}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Config
        </Button>
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
                disabled={isSaving}
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
                <Label htmlFor="base-fee">Base Fee (₹)</Label>
                <Input
                  id="base-fee"
                  type="number"
                  step="0.01"
                  value={deliveryConfig.base_fee}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, base_fee: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              {deliveryConfig.type === "distance_based" && (
                <div className="space-y-2">
                  <Label htmlFor="per-km-rate">Per KM Rate (₹)</Label>
                  <Input
                    id="per-km-rate"
                    type="number"
                    step="0.01"
                    value={deliveryConfig.per_km_rate}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, per_km_rate: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-fee">Minimum Fee (₹)</Label>
                <Input
                  id="min-fee"
                  type="number"
                  step="0.01"
                  value={deliveryConfig.min_fee}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, min_fee: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-fee">Maximum Fee (₹)</Label>
                <Input
                  id="max-fee"
                  type="number"
                  step="0.01"
                  value={deliveryConfig.max_fee}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, max_fee: e.target.value })}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="free-threshold">Free Delivery Threshold (₹)</Label>
              <Input
                id="free-threshold"
                type="number"
                step="0.01"
                value={deliveryConfig.free_delivery_threshold}
                onChange={(e) => setDeliveryConfig({ ...deliveryConfig, free_delivery_threshold: e.target.value })}
                disabled={isSaving}
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
                disabled={isSaving}
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
                {appConfig.type === "percentage" ? "Percentage (%)" : "Fixed Amount (₹)"}
              </Label>
              <Input
                id="app-fee-value"
                type="number"
                step={appConfig.type === "percentage" ? "0.1" : "0.01"}
                value={appConfig.value}
                onChange={(e) => setAppConfig({ ...appConfig, value: e.target.value })}
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="app-min-fee">Minimum Fee (₹)</Label>
                <Input
                  id="app-min-fee"
                  type="number"
                  step="0.01"
                  value={appConfig.min_fee}
                  onChange={(e) => setAppConfig({ ...appConfig, min_fee: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-max-fee">Maximum Fee (₹)</Label>
                <Input
                  id="app-max-fee"
                  type="number"
                  step="0.01"
                  value={appConfig.max_fee}
                  onChange={(e) => setAppConfig({ ...appConfig, max_fee: e.target.value })}
                  disabled={isSaving}
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
                <Label htmlFor="sim-order-value">Order Value (₹)</Label>
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
                  <span className="font-medium">₹{simulatedOrderValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span className="font-medium">₹{simulatedDeliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>App Fee:</span>
                  <span className="font-medium">₹{simulatedAppFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total Fees:</span>
                  <span>₹{totalFees.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Customer Summary</h3>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{simulatedOrderValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>₹{simulatedDeliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee:</span>
                  <span>₹{simulatedAppFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>₹{(simulatedOrderValue + totalFees).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          className="px-8"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving to Database...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Pricing Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}