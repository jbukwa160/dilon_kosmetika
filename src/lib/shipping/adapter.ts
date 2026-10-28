import "server-only";
import type { Order } from "@/lib/orders";
import type { CarrierId, City, Office } from "./types";

export type ShipmentOptions = {
  weightKg: number;
  parcels: number;
  /** Cash on delivery in euro (0 = none). */
  codAmount: number;
  /** Declared value in euro (0 = not declared). */
  declaredValue: number;
  /** BOX NOW compartment: 1 small, 2 medium (default), 3 large. Ignored by the other couriers. */
  boxSize?: 1 | 2 | 3;
};

export type ShipmentResult = {
  shipmentId: string;
  trackingNumber: string;
  data?: Record<string, unknown>;
};

/** A waybill as saved in DATA_DIR/shipments.json. */
export type Shipment = ShipmentResult & {
  carrier: CarrierId;
  createdAt: string;
  weightKg: number;
  parcels: number;
  codAmount: number;
  declaredValue: number;
};

export interface CarrierAdapter {
  id: CarrierId;
  /** Logins are set (offices can often be listed without them). */
  isConfigured(): boolean;
  searchCities(query: string): Promise<City[]>;
  listOffices(params: { cityId?: string; query?: string }): Promise<Office[]>;
  createShipment(order: Order, options: ShipmentOptions): Promise<ShipmentResult>;
  getLabelPdf(shipment: Shipment): Promise<Buffer>;
  cancelShipment(shipment: Shipment, orderNumber: string): Promise<void>;
  /** Read-only check of the logins: how many offices / lockers the courier lists. */
  test(): Promise<number>;
}

/** What the parcel holds, for the couriers' "contents" field. */
export const CONTENTS = "Козметика";
