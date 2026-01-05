import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  Truck, 
  MapPin, 
  ChefHat,
  CircleDot,
  Loader2
} from 'lucide-react';

interface OrderTrackerProps {
  orderId: string;
  authToken: string;
}

const ORDER_STATUSES = [
  { key: 'pending', label: 'Pending', icon: Clock, color: 'bg-yellow-500' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2, color: 'bg-blue-500' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, color: 'bg-orange-500' },
  { key: 'ready', label: 'Ready', icon: Package, color: 'bg-purple-500' },
  { key: 'picked_up', label: 'Picked Up', icon: Truck, color: 'bg-indigo-500' },
  { key: 'in_transit', label: 'In Transit', icon: MapPin, color: 'bg-cyan-500' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'bg-green-500' },
];

export function OrderTracker({ orderId, authToken }: OrderTrackerProps) {
  const {
    isConnected,
    currentStatus,
    driverLocation,
    estimatedDelivery,
    statusHistory,
    error,
  } = useOrderTracking(orderId, authToken);

  const currentStatusIndex = ORDER_STATUSES.findIndex(
    (s) => s.key === currentStatus
  );
  const progress = currentStatus 
    ? ((currentStatusIndex + 1) / ORDER_STATUSES.length) * 100 
    : 0;

  const getStatusColor = (status: string) => {
    const statusConfig = ORDER_STATUSES.find((s) => s.key === status);
    return statusConfig?.color || 'bg-gray-500';
  };

  const getStatusIcon = (status: string) => {
    const statusConfig = ORDER_STATUSES.find((s) => s.key === status);
    return statusConfig?.icon || CircleDot;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Tracking
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              #{orderId.slice(0, 8)}...
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CircleDot className="h-3 w-3 mr-1 animate-pulse" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Connecting...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Order Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current Status */}
        {currentStatus && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            {(() => {
              const StatusIcon = getStatusIcon(currentStatus);
              return (
                <div className={`p-3 rounded-full ${getStatusColor(currentStatus)} text-white`}>
                  <StatusIcon className="h-6 w-6" />
                </div>
              );
            })()}
            <div>
              <p className="font-semibold text-lg capitalize">
                {currentStatus.replace('_', ' ')}
              </p>
              {estimatedDelivery && (
                <p className="text-sm text-muted-foreground">
                  Estimated delivery: {new Date(estimatedDelivery).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Driver Location */}
        {driverLocation && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">Driver Location</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Lat: {driverLocation.lat.toFixed(6)}, Lng: {driverLocation.lng.toFixed(6)}
            </p>
          </div>
        )}

        <Separator />

        {/* Status Timeline */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Order Timeline</h4>
          <div className="space-y-3">
            {ORDER_STATUSES.map((status, index) => {
              const isCompleted = currentStatusIndex >= index;
              const isCurrent = currentStatusIndex === index;
              const StatusIcon = status.icon;

              return (
                <div
                  key={status.key}
                  className={`flex items-center gap-3 ${
                    isCompleted ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <div
                    className={`p-2 rounded-full ${
                      isCurrent
                        ? `${status.color} text-white animate-pulse`
                        : isCompleted
                        ? `${status.color} text-white`
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isCurrent ? 'text-foreground' : ''}`}>
                      {status.label}
                    </p>
                    {statusHistory.find((h) => h.status === status.key) && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          statusHistory.find((h) => h.status === status.key)!.timestamp
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default OrderTracker;



