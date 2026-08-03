"use client";

import { useEffect, useState } from "react";

type VehicleGroup = "road" | "motorcycle" | "marine" | "air";
type VehicleCondition = "new" | "used";
type RoadClass = "light" | "heavy" | "motorcycle" | "trailer" | "special";
type ExchangeStatus = "loading" | "official" | "manual" | "error";

type VehicleVariant = {
  id: string;
  group: VehicleGroup;
  label: string;
  detail: string;
  codeNew: string;
  codeUsed: string;
  dutyNew: number;
  dutyUsed: number;
  iec: number;
  electric?: boolean;
  roadClass?: RoadClass;
};

const GROUPS: Array<{ id: VehicleGroup; label: string; short: string }> = [
  { id: "road", label: "Viaturas terrestres", short: "Terrestres" },
  { id: "motorcycle", label: "Motociclos", short: "Motociclos" },
  { id: "marine", label: "Embarcações", short: "Embarcações" },
  { id: "air", label: "Aeronaves", short: "Aeronaves" },
];

const GROUP_VISUALS: Record<VehicleGroup, { title: string; category: string; description: string }> = {
  road: {
    title: "Lexus LX 600",
    category: "VIATURA TERRESTRE · REFERÊNCIA VISUAL",
    description: "SUV de passageiros utilizado para representar automóveis ligeiros no simulador.",
  },
  motorcycle: {
    title: "BMW R 1200 GS",
    category: "MOTOCICLO · REFERÊNCIA VISUAL",
    description: "Motociclo de aventura utilizado para representar a categoria de duas rodas.",
  },
  marine: {
    title: "Iate a motor de recreio",
    category: "EMBARCAÇÃO · REFERÊNCIA VISUAL",
    description: "Embarcação de recreio utilizada para representar barcos e outras estruturas flutuantes.",
  },
  air: {
    title: "Avião executivo de longo curso",
    category: "AERONAVE · REFERÊNCIA VISUAL",
    description: "Jacto executivo utilizado para representar aeronaves e aparelhos aéreos.",
  },
};

const VEHICLES: VehicleVariant[] = [
  { id: "petrol-1000", group: "road", label: "Automóvel a gasolina · até 1 000 cm³", detail: "Passageiros, excepto ambulâncias e funerários", codeNew: "8703.21.19", codeUsed: "8703.21.29", dutyNew: 5, dutyUsed: 5, iec: 0, roadClass: "light" },
  { id: "petrol-1500", group: "road", label: "Automóvel a gasolina · 1 001 a 1 500 cm³", detail: "Passageiros, excepto ambulâncias e funerários", codeNew: "8703.22.19", codeUsed: "8703.22.29", dutyNew: 5, dutyUsed: 10, iec: 0, roadClass: "light" },
  { id: "petrol-3000", group: "road", label: "Automóvel a gasolina · 1 501 a 3 000 cm³", detail: "Passageiros, excepto ambulâncias e funerários", codeNew: "8703.23.20", codeUsed: "8703.23.39", dutyNew: 10, dutyUsed: 15, iec: 0, roadClass: "light" },
  { id: "petrol-over-3000", group: "road", label: "Automóvel a gasolina · mais de 3 000 cm³", detail: "Passageiros de alta cilindrada", codeNew: "8703.24.49", codeUsed: "8703.24.59", dutyNew: 15, dutyUsed: 20, iec: 5, roadClass: "light" },
  { id: "diesel-1500", group: "road", label: "Automóvel a gasóleo · até 1 500 cm³", detail: "Passageiros, excepto ambulâncias e funerários", codeNew: "8703.31.19", codeUsed: "8703.31.29", dutyNew: 5, dutyUsed: 10, iec: 0, roadClass: "light" },
  { id: "diesel-2500", group: "road", label: "Automóvel a gasóleo · 1 501 a 2 500 cm³", detail: "Passageiros, excepto ambulâncias e funerários", codeNew: "8703.32.39", codeUsed: "8703.32.49", dutyNew: 10, dutyUsed: 15, iec: 0, roadClass: "light" },
  { id: "diesel-over-2500", group: "road", label: "Automóvel a gasóleo · mais de 2 500 cm³", detail: "Passageiros de alta cilindrada", codeNew: "8703.33.59", codeUsed: "8703.33.69", dutyNew: 15, dutyUsed: 20, iec: 5, roadClass: "light" },
  { id: "hybrid-petrol", group: "road", label: "Automóvel híbrido a gasolina", detail: "Híbrido não recarregável externamente", codeNew: "8703.40.00", codeUsed: "8703.40.00", dutyNew: 10, dutyUsed: 10, iec: 0, roadClass: "light" },
  { id: "hybrid-diesel", group: "road", label: "Automóvel híbrido a gasóleo", detail: "Híbrido não recarregável externamente", codeNew: "8703.50.00", codeUsed: "8703.50.00", dutyNew: 10, dutyUsed: 10, iec: 0, roadClass: "light" },
  { id: "plugin-petrol", group: "road", label: "Automóvel híbrido plug-in a gasolina", detail: "Recarregável por fonte externa", codeNew: "8703.60.00", codeUsed: "8703.60.00", dutyNew: 10, dutyUsed: 10, iec: 0, roadClass: "light" },
  { id: "plugin-diesel", group: "road", label: "Automóvel híbrido plug-in a gasóleo", detail: "Recarregável por fonte externa", codeNew: "8703.70.00", codeUsed: "8703.70.00", dutyNew: 10, dutyUsed: 10, iec: 0, roadClass: "light" },
  { id: "electric-car", group: "road", label: "Automóvel 100% eléctrico", detail: "Unicamente com motor eléctrico para propulsão", codeNew: "8703.80.00", codeUsed: "8703.80.00", dutyNew: 0, dutyUsed: 0, iec: 0, electric: true, roadClass: "light" },
  { id: "bus-over-18", group: "road", label: "Autocarro a gasóleo · mais de 18 pessoas", detail: "Incluindo o motorista", codeNew: "8702.10.11", codeUsed: "8702.10.21", dutyNew: 0, dutyUsed: 5, iec: 0, roadClass: "light" },
  { id: "bus-up-to-18", group: "road", label: "Autocarro a gasóleo · 10 a 18 pessoas", detail: "Incluindo o motorista", codeNew: "8702.10.19", codeUsed: "8702.10.29", dutyNew: 5, dutyUsed: 10, iec: 0, roadClass: "light" },
  { id: "hybrid-bus", group: "road", label: "Autocarro híbrido", detail: "Gasolina ou gasóleo com motor eléctrico", codeNew: "8702.20.00", codeUsed: "8702.20.00", dutyNew: 5, dutyUsed: 5, iec: 0, roadClass: "light" },
  { id: "electric-bus", group: "road", label: "Autocarro 100% eléctrico", detail: "Unicamente com motor eléctrico", codeNew: "8702.40.00", codeUsed: "8702.40.00", dutyNew: 0, dutyUsed: 0, iec: 0, electric: true, roadClass: "light" },
  { id: "pickup-diesel-3500", group: "road", label: "Pickup ou furgão a gasóleo · até 3 500 cm³", detail: "Peso bruto não superior a 5 toneladas", codeNew: "8704.21.10", codeUsed: "8704.21.13", dutyNew: 10, dutyUsed: 15, iec: 5, roadClass: "light" },
  { id: "pickup-diesel-over-3500", group: "road", label: "Pickup ou furgão a gasóleo · mais de 3 500 cm³", detail: "Peso bruto não superior a 5 toneladas", codeNew: "8704.21.11", codeUsed: "8704.21.14", dutyNew: 15, dutyUsed: 20, iec: 5, roadClass: "light" },
  { id: "pickup-petrol-3500", group: "road", label: "Pickup ou furgão a gasolina · até 3 500 cm³", detail: "Peso bruto não superior a 5 toneladas", codeNew: "8704.31.10", codeUsed: "8704.31.14", dutyNew: 10, dutyUsed: 15, iec: 0, roadClass: "light" },
  { id: "pickup-petrol-over-3500", group: "road", label: "Pickup ou furgão a gasolina · mais de 3 500 cm³", detail: "Peso bruto não superior a 5 toneladas", codeNew: "8704.31.11", codeUsed: "8704.31.15", dutyNew: 15, dutyUsed: 20, iec: 0, roadClass: "light" },
  { id: "light-goods", group: "road", label: "Outro veículo ligeiro de mercadorias", detail: "A gasóleo, até 5 toneladas", codeNew: "8704.21.12", codeUsed: "8704.21.19", dutyNew: 0, dutyUsed: 5, iec: 0, roadClass: "light" },
  { id: "truck-20", group: "road", label: "Camião · 5 a 20 toneladas", detail: "Unicamente com motor a gasóleo", codeNew: "8704.22.10", codeUsed: "8704.22.90", dutyNew: 0, dutyUsed: 5, iec: 0, roadClass: "heavy" },
  { id: "truck-over-20", group: "road", label: "Camião · mais de 20 toneladas", detail: "Unicamente com motor a gasóleo", codeNew: "8704.23.10", codeUsed: "8704.23.90", dutyNew: 0, dutyUsed: 5, iec: 0, roadClass: "heavy" },
  { id: "electric-goods", group: "road", label: "Veículo de mercadorias 100% eléctrico", detail: "Unicamente com motor eléctrico", codeNew: "8704.60.00", codeUsed: "8704.60.00", dutyNew: 0, dutyUsed: 0, iec: 0, electric: true, roadClass: "heavy" },
  { id: "special-road", group: "road", label: "Veículo automóvel para uso especial", detail: "Bombeiros, guindaste, betoneira, oficina ou semelhante", codeNew: "8705.90.00", codeUsed: "8705.90.00", dutyNew: 0, dutyUsed: 0, iec: 0, roadClass: "special" },
  { id: "tractor", group: "road", label: "Tractor agrícola ou rodoviário comum", detail: "O código final varia com potência e configuração", codeNew: "8701.91.00", codeUsed: "8701.91.00", dutyNew: 0, dutyUsed: 0, iec: 0, roadClass: "special" },
  { id: "trailer", group: "road", label: "Reboque ou semi-reboque de mercadorias", detail: "Outros, para transporte de mercadorias", codeNew: "8716.39.00", codeUsed: "8716.39.00", dutyNew: 0, dutyUsed: 0, iec: 0, roadClass: "trailer" },
  { id: "caravan", group: "road", label: "Caravana para habitação ou campismo", detail: "Reboque ou semi-reboque", codeNew: "8716.10.00", codeUsed: "8716.10.00", dutyNew: 5, dutyUsed: 5, iec: 0, roadClass: "trailer" },

  { id: "moto-50", group: "motorcycle", label: "Motociclo · até 50 cm³", detail: "Incluindo ciclomotores", codeNew: "8711.10.10", codeUsed: "8711.10.90", dutyNew: 5, dutyUsed: 10, iec: 0, roadClass: "motorcycle" },
  { id: "moto-250", group: "motorcycle", label: "Motociclo · 51 a 250 cm³", detail: "Motor de pistão", codeNew: "8711.20.12", codeUsed: "8711.20.13", dutyNew: 10, dutyUsed: 15, iec: 0, roadClass: "motorcycle" },
  { id: "moto-500", group: "motorcycle", label: "Motociclo · 251 a 500 cm³", detail: "Motor de pistão", codeNew: "8711.30.14", codeUsed: "8711.30.15", dutyNew: 15, dutyUsed: 20, iec: 0, roadClass: "motorcycle" },
  { id: "moto-800", group: "motorcycle", label: "Motociclo · 501 a 800 cm³", detail: "Motor de pistão", codeNew: "8711.40.16", codeUsed: "8711.40.17", dutyNew: 20, dutyUsed: 30, iec: 0, roadClass: "motorcycle" },
  { id: "moto-over-800", group: "motorcycle", label: "Motociclo · mais de 800 cm³", detail: "Motor de pistão", codeNew: "8711.50.00", codeUsed: "8711.50.00", dutyNew: 20, dutyUsed: 20, iec: 0, roadClass: "motorcycle" },
  { id: "electric-moto", group: "motorcycle", label: "Motociclo 100% eléctrico", detail: "Unicamente com motor eléctrico", codeNew: "8711.60.00", codeUsed: "8711.60.00", dutyNew: 5, dutyUsed: 5, iec: 0, electric: true, roadClass: "motorcycle" },

  { id: "passenger-ship", group: "marine", label: "Ferryboat ou embarcação de passageiros", detail: "Transatlânticos, excursão e semelhantes", codeNew: "8901.10.00", codeUsed: "8901.10.00", dutyNew: 0, dutyUsed: 0, iec: 0 },
  { id: "cargo-ship", group: "marine", label: "Navio-tanque ou cargueiro", detail: "Transporte de mercadorias", codeNew: "8901.20.00", codeUsed: "8901.20.00", dutyNew: 0, dutyUsed: 0, iec: 0 },
  { id: "fishing-ship", group: "marine", label: "Barco de pesca ou navio-fábrica", detail: "Tratamento ou conservação de produtos da pesca", codeNew: "8902.00.00", codeUsed: "8902.00.00", dutyNew: 0, dutyUsed: 0, iec: 0 },
  { id: "inflatable-boat", group: "marine", label: "Barco insuflável de recreio", detail: "Com ou sem motor", codeNew: "8903.11.00", codeUsed: "8903.11.00", dutyNew: 10, dutyUsed: 10, iec: 20 },
  { id: "inflatable-non-motor", group: "marine", label: "Barco insuflável sem motor · até 100 kg", detail: "Não concebido para utilização com motor", codeNew: "8903.12.00", codeUsed: "8903.12.00", dutyNew: 10, dutyUsed: 10, iec: 20 },
  { id: "sailboat-75", group: "marine", label: "Barco à vela · até 7,5 m", detail: "Mesmo com motor auxiliar", codeNew: "8903.21.00", codeUsed: "8903.21.00", dutyNew: 10, dutyUsed: 10, iec: 20 },
  { id: "sailboat-24", group: "marine", label: "Barco à vela · 7,5 a 24 m", detail: "Mesmo com motor auxiliar", codeNew: "8903.22.00", codeUsed: "8903.22.00", dutyNew: 10, dutyUsed: 10, iec: 20 },
  { id: "sailboat-over-24", group: "marine", label: "Barco à vela · mais de 24 m", detail: "Mesmo com motor auxiliar", codeNew: "8903.23.00", codeUsed: "8903.23.00", dutyNew: 10, dutyUsed: 10, iec: 20 },
  { id: "motorboat-75", group: "marine", label: "Barco a motor · até 7,5 m", detail: "Excepto insuflável e motor fora-de-borda", codeNew: "8903.31.00", codeUsed: "8903.31.00", dutyNew: 10, dutyUsed: 10, iec: 20 },
  { id: "motorboat-24", group: "marine", label: "Barco a motor · 7,5 a 24 m", detail: "Excepto insuflável e motor fora-de-borda", codeNew: "8903.32.00", codeUsed: "8903.32.00", dutyNew: 10, dutyUsed: 10, iec: 20 },
  { id: "motorboat-over-24", group: "marine", label: "Barco a motor · mais de 24 m", detail: "Excepto insuflável e motor fora-de-borda", codeNew: "8903.33.00", codeUsed: "8903.33.00", dutyNew: 10, dutyUsed: 10, iec: 20 },
  { id: "small-pleasure", group: "marine", label: "Outra embarcação de recreio · até 7,5 m", detail: "Excepto canoa", codeNew: "8903.93.00", codeUsed: "8903.93.00", dutyNew: 5, dutyUsed: 5, iec: 20 },
  { id: "canoe", group: "marine", label: "Canoa", detail: "Outras embarcações de recreio", codeNew: "8903.99.10", codeUsed: "8903.99.10", dutyNew: 5, dutyUsed: 5, iec: 20 },
  { id: "electric-boat", group: "marine", label: "Embarcação de recreio 100% eléctrica", detail: "Código representativo; confirmar casco e comprimento", codeNew: "8903.99.90", codeUsed: "8903.99.90", dutyNew: 10, dutyUsed: 10, iec: 20, electric: true },
  { id: "tug", group: "marine", label: "Rebocador ou embarcação de serviço", detail: "Rebocar, empurrar, dragar ou serviço especial", codeNew: "8904.00.00", codeUsed: "8904.00.00", dutyNew: 0, dutyUsed: 0, iec: 0 },
  { id: "special-vessel", group: "marine", label: "Draga, plataforma ou embarcação especial", detail: "Navegação acessória à função principal", codeNew: "8905.90.00", codeUsed: "8905.90.00", dutyNew: 0, dutyUsed: 0, iec: 0 },
  { id: "other-vessel", group: "marine", label: "Outra embarcação não recreativa", detail: "Incluindo barcos salva-vidas; excepto barcos a remos", codeNew: "8906.90.00", codeUsed: "8906.90.00", dutyNew: 0, dutyUsed: 0, iec: 0 },

  { id: "balloon-glider", group: "air", label: "Balão, dirigível ou planador", detail: "Não concebido para propulsão a motor", codeNew: "8801.00.00", codeUsed: "8801.00.00", dutyNew: 0, dutyUsed: 0, iec: 20 },
  { id: "helicopter-light", group: "air", label: "Helicóptero · até 2 000 kg vazio", detail: "Peso sem carga não superior a 2 000 kg", codeNew: "8802.11.00", codeUsed: "8802.11.00", dutyNew: 0, dutyUsed: 0, iec: 20 },
  { id: "helicopter-heavy", group: "air", label: "Helicóptero · mais de 2 000 kg vazio", detail: "Peso sem carga superior a 2 000 kg", codeNew: "8802.12.00", codeUsed: "8802.12.00", dutyNew: 0, dutyUsed: 0, iec: 0 },
  { id: "plane-light", group: "air", label: "Avião · até 2 000 kg vazio", detail: "Aviões e outros veículos aéreos", codeNew: "8802.20.00", codeUsed: "8802.20.00", dutyNew: 0, dutyUsed: 0, iec: 20 },
  { id: "plane-medium", group: "air", label: "Avião · 2 001 a 15 000 kg vazio", detail: "Aviões e outros veículos aéreos", codeNew: "8802.30.00", codeUsed: "8802.30.00", dutyNew: 0, dutyUsed: 0, iec: 0 },
  { id: "plane-heavy", group: "air", label: "Avião · mais de 15 000 kg vazio", detail: "Aviões e outros veículos aéreos", codeNew: "8802.40.00", codeUsed: "8802.40.00", dutyNew: 0, dutyUsed: 0, iec: 0 },
  { id: "passenger-drone", group: "air", label: "Aeronave não tripulada para passageiros", detail: "Concebida para transporte de passageiros", codeNew: "8806.10.00", codeUsed: "8806.10.00", dutyNew: 0, dutyUsed: 0, iec: 0 },
  { id: "drone-250", group: "air", label: "Drone · até 250 g", detail: "Aeronave não tripulada", codeNew: "8806.21.00", codeUsed: "8806.21.00", dutyNew: 5, dutyUsed: 5, iec: 0 },
  { id: "drone-7", group: "air", label: "Drone · 251 g a 7 kg", detail: "Aeronave não tripulada", codeNew: "8806.22.00", codeUsed: "8806.22.00", dutyNew: 5, dutyUsed: 5, iec: 0 },
  { id: "drone-25", group: "air", label: "Drone · mais de 7 kg até 25 kg", detail: "Aeronave não tripulada", codeNew: "8806.23.00", codeUsed: "8806.23.00", dutyNew: 5, dutyUsed: 5, iec: 0 },
  { id: "drone-150", group: "air", label: "Drone · mais de 25 kg até 150 kg", detail: "Aeronave não tripulada", codeNew: "8806.24.00", codeUsed: "8806.24.00", dutyNew: 5, dutyUsed: 5, iec: 0 },
  { id: "drone-other", group: "air", label: "Outra aeronave não tripulada", detail: "Fora das classes de peso anteriores", codeNew: "8806.29.00", codeUsed: "8806.29.00", dutyNew: 5, dutyUsed: 5, iec: 0 },
  { id: "electric-aircraft", group: "air", label: "Aeronave 100% eléctrica", detail: "Código representativo; confirmar peso e configuração", codeNew: "8802.20.00", codeUsed: "8802.20.00", dutyNew: 0, dutyUsed: 0, iec: 20, electric: true },
];

const ANTT_FEES: Partial<Record<RoadClass, number>> = {
  light: 132000,
  heavy: 176000,
  motorcycle: 88000,
  trailer: 105600,
};

const MAX_USED_AGE: Partial<Record<RoadClass, number>> = {
  light: 5,
  heavy: 8,
  motorcycle: 3,
};

const CURRENCIES = [
  ["AOA", "Kwanza angolano"],
  ["USD", "Dólar americano"],
  ["EUR", "Euro"],
  ["CNY", "Yuan chinês"],
  ["AED", "Dirham dos Emirados"],
  ["GBP", "Libra esterlina"],
  ["ZAR", "Rand sul-africano"],
  ["JPY", "Iene japonês"],
  ["CHF", "Franco suíço"],
  ["CAD", "Dólar canadiano"],
  ["AUD", "Dólar australiano"],
  ["BRL", "Real brasileiro"],
  ["INR", "Rupia indiana"],
  ["KRW", "Won sul-coreano"],
  ["MZN", "Metical moçambicano"],
  ["NAD", "Dólar namibiano"],
] as const;

const EXCHANGE_SPREAD = 0.035;
const CREDIT_ANNUAL_RATE = 0.25;
const CREDIT_MAX_MONTHS = 60;

function formatKz(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}

function formatOriginal(value: number, currency: string) {
  return `${value.toLocaleString("pt-AO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

function formatExchangeRate(value: number) {
  return value.toLocaleString("pt-AO", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function formatBnaDate(value: string) {
  if (!value) return "data não indicada";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
}

function rateLabel(rate: number) {
  return rate === 0 ? "Livre" : `${rate.toLocaleString("pt-AO", { maximumFractionDigits: 1 })}%`;
}

export default function VehicleSimulator() {
  const [group, setGroup] = useState<VehicleGroup>("road");
  const [vehicleId, setVehicleId] = useState("petrol-3000");
  const [condition, setCondition] = useState<VehicleCondition>("new");
  const [firstRegistrationYear, setFirstRegistrationYear] = useState(2023);
  const [currency, setCurrency] = useState("USD");
  const [bnaRate, setBnaRate] = useState<number | null>(null);
  const [bnaRateDate, setBnaRateDate] = useState("");
  const [exchangeStatus, setExchangeStatus] = useState<ExchangeStatus>("loading");
  const [purchaseValue, setPurchaseValue] = useState(25000);
  const [freight, setFreight] = useState(2000);
  const [insurance, setInsurance] = useState(250);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [loanTermMonths, setLoanTermMonths] = useState(CREDIT_MAX_MONTHS);

  useEffect(() => {
    const controller = new AbortController();

    if (currency === "AOA") {
      return () => controller.abort();
    }

    fetch(`/api/exchange?currency=${encodeURIComponent(currency)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as { rate?: number; date?: string | null; error?: string };
        if (!response.ok || !payload.rate) throw new Error(payload.error ?? "Taxa indisponível");
        setBnaRate(payload.rate);
        setBnaRateDate(payload.date ?? "");
        setExchangeStatus("official");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setExchangeStatus("error");
      });

    return () => controller.abort();
  }, [currency]);

  const groupVehicles = VEHICLES.filter((item) => item.group === group);
  const vehicle = VEHICLES.find((item) => item.id === vehicleId) ?? groupVehicles[0];
  const groupVisual = GROUP_VISUALS[group];
  const exchangeRate = currency === "AOA" ? 1 : (bnaRate ?? 0) * (1 + EXCHANGE_SPREAD);
  const exchangeReady = currency === "AOA" || (bnaRate !== null && bnaRate > 0);

  const calculation = (() => {
    const customsValueOriginal = Math.max(0, purchaseValue) + Math.max(0, freight) + Math.max(0, insurance);
    const customsValue = exchangeReady ? customsValueOriginal * exchangeRate : 0;
    const tariffDutyRate = condition === "new" ? vehicle.dutyNew : vehicle.dutyUsed;
    const effectiveDutyRate = vehicle.electric ? tariffDutyRate * 0.5 : tariffDutyRate;
    const iecRate = vehicle.electric ? 0 : vehicle.iec;
    const customsDuty = customsValue * effectiveDutyRate / 100;
    const iec = customsValue * iecRate / 100;
    const customsFee = customsValue * 0.02;
    const stampDuty = customsValue * 0.01;
    const vatBase = customsValue + customsDuty + iec + customsFee + stampDuty;
    const vat = vatBase * 0.14;
    const anttFee = vehicle.roadClass ? ANTT_FEES[vehicle.roadClass] ?? 0 : 0;
    const taxes = customsDuty + iec + customsFee + stampDuty + vat;
    return {
      customsValueOriginal,
      customsValue,
      tariffDutyRate,
      effectiveDutyRate,
      iecRate,
      customsDuty,
      iec,
      customsFee,
      stampDuty,
      vatBase,
      vat,
      anttFee,
      taxes,
      totalCharges: taxes + anttFee,
      landedValue: customsValue + taxes + anttFee,
    };
  })();

  const selectedCode = condition === "new" ? vehicle.codeNew : vehicle.codeUsed;
  const maxUsedAge = vehicle.roadClass ? MAX_USED_AGE[vehicle.roadClass] : undefined;
  const usedAge = Math.max(0, 2026 - firstRegistrationYear);
  const exceedsAge = condition === "used" && maxUsedAge !== undefined && usedAge > maxUsedAge;
  const credit = (() => {
    const downPayment = Math.min(calculation.landedValue, Math.max(0, calculation.landedValue * downPaymentPercent / 100));
    const financedAmount = Math.max(0, calculation.landedValue - downPayment);
    const monthlyRate = CREDIT_ANNUAL_RATE / 12;
    const monthlyPayment = financedAmount > 0
      ? financedAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -loanTermMonths))
      : 0;
    const installmentsTotal = monthlyPayment * loanTermMonths;
    return {
      downPayment,
      financedAmount,
      monthlyRate,
      monthlyPayment,
      installmentsTotal,
      interestTotal: Math.max(0, installmentsTotal - financedAmount),
      totalWithCredit: downPayment + installmentsTotal,
    };
  })();

  function selectGroup(nextGroup: VehicleGroup) {
    setGroup(nextGroup);
    const first = VEHICLES.find((item) => item.group === nextGroup);
    if (first) setVehicleId(first.id);
  }

  function changeCurrency(nextCurrency: string) {
    setCurrency(nextCurrency);
    setBnaRate(nextCurrency === "AOA" ? 1 : null);
    setBnaRateDate("");
    setExchangeStatus(nextCurrency === "AOA" ? "official" : "loading");
  }

  return (
    <section className="vehicle-page" id="top">
      <div className="vehicle-intro">
        <div>
          <p className="eyebrow">SIMULADOR DE IMPORTAÇÃO · ANGOLA 2026</p>
          <h1>Da compra ao<br />desalfandegamento.</h1>
          <p>Estime Direitos Aduaneiros, IEC, Emolumentos Gerais, Imposto de Selo e IVA para viaturas terrestres, motociclos, embarcações e aeronaves.</p>
        </div>
        <div className="electric-summary">
          <span className="electric-kicker">INCENTIVO À ELECTROMOBILIDADE</span>
          <strong>Eléctricos pagam menos.</strong>
          <div><span><b>−50%</b> Direitos Aduaneiros</span><span><b>Isento</b> de IEC</span><span><b>−50%</b> IVM após matrícula</span></div>
          <small>Benefícios até 2032. O IVA mantém a taxa geral.</small>
        </div>
      </div>

      <div className="vehicle-group-tabs" role="tablist" aria-label="Tipo de meio de transporte">
        {GROUPS.map((item, index) => (
          <button key={item.id} className={group === item.id ? "active" : ""} onClick={() => selectGroup(item.id)} role="tab" aria-selected={group === item.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
          </button>
        ))}
      </div>

      <section className="vehicle-showcase" aria-label={`Referência visual: ${groupVisual.title}`}>
        <div className={`vehicle-showcase-image ${group}`} role="img" aria-label={groupVisual.title} />
        <div className="vehicle-showcase-copy">
          <span>{groupVisual.category}</span>
          <h2>{groupVisual.title}</h2>
          <p>{groupVisual.description}</p>
          <small>A imagem é ilustrativa. A classificação e os impostos dependem das características seleccionadas abaixo.</small>
        </div>
      </section>

      <div className="simulator-layout">
        <div className="simulator-form-card">
          <div className="simulator-card-heading"><span>01</span><div><strong>Características da importação</strong><small>Escolha o enquadramento mais próximo</small></div></div>

          <label className="simulator-field wide">
            <span>Tipo de {GROUPS.find((item) => item.id === group)?.short.toLowerCase()}</span>
            <select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
              {groupVehicles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <small>{vehicle.detail}</small>
          </label>

          <div className="condition-field">
            <span>Estado</span>
            <div>
              <button className={condition === "new" ? "active" : ""} onClick={() => setCondition("new")} aria-pressed={condition === "new"}>Novo</button>
              <button className={condition === "used" ? "active" : ""} onClick={() => setCondition("used")} aria-pressed={condition === "used"}>Usado</button>
            </div>
          </div>

          {condition === "new" && <p className="condition-note">Na Pauta, “novo” exige ausência de registo de propriedade, sem sinais de uso prolongado e deslocação não superior a 3 000 km.</p>}

          {condition === "used" && maxUsedAge !== undefined && (
            <label className="simulator-field registration-year">
              <span>Ano do primeiro registo</span>
              <input type="number" min="1980" max="2026" value={firstRegistrationYear} onChange={(event) => setFirstRegistrationYear(Number(event.target.value))} />
              <small>Limite geral: {maxUsedAge} anos para esta categoria.</small>
            </label>
          )}

          {condition === "used" && (
            <div className={`age-check ${exceedsAge ? "invalid" : "valid"}`}>
              <span aria-hidden="true">{exceedsAge ? "!" : "✓"}</span>
              <div><strong>{exceedsAge ? "Fora do limite geral de importação" : "Estado usado considerado no código e na taxa"}</strong><small>{maxUsedAge === undefined ? "A Pauta não separa novo e usado nesta rubrica; a taxa simulada é a mesma. Confirme os requisitos da autoridade sectorial." : exceedsAge ? `A idade calculada é ${usedAge} anos; o limite legal geral é ${maxUsedAge}. Verifique se existe uma excepção aplicável.` : `Idade calculada: ${usedAge} anos. Sujeito a autorização e inspecção.`}</small></div>
            </div>
          )}

          <div className="value-heading exchange-heading"><span>02</span><div><strong>Conversão cambial</strong><small>Taxa oficial do conversor BNA com spread de 3,5%</small></div></div>
          <div className="exchange-grid">
            <label className="simulator-field currency-field">
              <span>Moeda original</span>
              <select value={currency} onChange={(event) => changeCurrency(event.target.value)}>
                {CURRENCIES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
              </select>
            </label>
            <div className={`exchange-rate-card ${exchangeStatus}`}>
              <div className="exchange-rate-topline"><span>TAXA DE REFERÊNCIA BNA · COMPRA (G)</span><a href="https://www.bna.ao/#/pt" target="_blank" rel="noreferrer">Abrir conversor ↗</a></div>
              <div className="exchange-rate-values">
                <label>
                  <span>1 {currency} =</span>
                  <div><input aria-label={`Taxa BNA de ${currency} para AOA`} type="number" min="0" step="0.0001" value={bnaRate ?? ""} disabled={currency === "AOA" || exchangeStatus === "loading"} onChange={(event) => { setBnaRate(Number(event.target.value)); setBnaRateDate(""); setExchangeStatus("manual"); }} /><b>AOA</b></div>
                </label>
                <div className="spread-rate"><span>Spread aplicado</span><strong>+3,5%</strong><small>Taxa final: {exchangeReady ? `${formatExchangeRate(exchangeRate)} AOA` : "—"}</small></div>
              </div>
              <p>{exchangeStatus === "loading" ? "A consultar o conversor oficial do BNA…" : exchangeStatus === "error" ? "BNA indisponível. Introduza manualmente a taxa apresentada no conversor oficial." : exchangeStatus === "manual" ? "Taxa alterada manualmente. Confirme-a no portal do BNA." : currency === "AOA" ? "Sem conversão cambial." : `Cotação BNA de ${formatBnaDate(bnaRateDate)}.`}</p>
            </div>
          </div>

          <div className="value-heading"><span>03</span><div><strong>Valor aduaneiro</strong><small>Introduza os montantes na moeda original</small></div></div>
          <div className="value-fields">
            <label className="simulator-field"><span>Preço de compra</span><div className="money-input"><input type="number" min="0" step={currency === "AOA" ? "1000" : "1"} value={purchaseValue} onChange={(event) => setPurchaseValue(Number(event.target.value))} /><b>{currency}</b></div></label>
            <label className="simulator-field"><span>Frete</span><div className="money-input"><input type="number" min="0" step={currency === "AOA" ? "1000" : "1"} value={freight} onChange={(event) => setFreight(Number(event.target.value))} /><b>{currency}</b></div></label>
            <label className="simulator-field"><span>Seguro</span><div className="money-input"><input type="number" min="0" step={currency === "AOA" ? "1000" : "1"} value={insurance} onChange={(event) => setInsurance(Number(event.target.value))} /><b>{currency}</b></div></label>
          </div>
          <div className="cif-lines">
            <div><span>CIF na moeda original</span><strong>{formatOriginal(calculation.customsValueOriginal, currency)}</strong></div>
            <div className="converted-cif"><span>Valor aduaneiro convertido</span><strong>{exchangeReady ? formatKz(calculation.customsValue) : "A aguardar taxa BNA"}</strong></div>
          </div>
        </div>

        <aside className="simulation-result" aria-live="polite">
          <div className="result-topline"><span>ESTIMATIVA 2026</span><button onClick={() => window.print()}>Imprimir</button></div>
          {currency !== "AOA" && (
            <div className="result-exchange"><span>CONVERSÃO CAMBIAL</span><strong>{formatOriginal(calculation.customsValueOriginal, currency)} → {exchangeReady ? formatKz(calculation.customsValue) : "—"}</strong><small>{exchangeReady ? `Taxa BNA ${formatExchangeRate(bnaRate ?? 0)} + spread 3,5% = ${formatExchangeRate(exchangeRate)} AOA` : "A aguardar uma taxa válida do BNA."}</small></div>
          )}
          <div className="selected-tariff"><small>CÓDIGO PAUTAL APLICADO</small><code>{selectedCode}</code><span>{vehicle.label} · {condition === "new" ? "Novo" : "Usado"}</span></div>

          {vehicle.electric && (
            <div className="electric-benefit"><span>VEÍCULO ELÉCTRICO</span><strong>Benefício fiscal aplicado</strong><small>Redução de 50% dos Direitos Aduaneiros e isenção de IEC.</small></div>
          )}

          <dl className="tax-breakdown">
            <div><dt><strong>Direitos Aduaneiros</strong><small>{vehicle.electric && calculation.tariffDutyRate > 0 ? `${rateLabel(calculation.tariffDutyRate)} × benefício de 50% = ${rateLabel(calculation.effectiveDutyRate)}` : rateLabel(calculation.effectiveDutyRate)}</small></dt><dd>{formatKz(calculation.customsDuty)}</dd></div>
            <div><dt><strong>Imposto Especial de Consumo</strong><small>{vehicle.electric ? "Isento · veículo eléctrico" : rateLabel(calculation.iecRate)}</small></dt><dd>{formatKz(calculation.iec)}</dd></div>
            <div><dt><strong>Emolumentos Gerais Aduaneiros</strong><small>2% do valor aduaneiro</small></dt><dd>{formatKz(calculation.customsFee)}</dd></div>
            <div><dt><strong>Imposto de Selo</strong><small>1% do valor aduaneiro</small></dt><dd>{formatKz(calculation.stampDuty)}</dd></div>
            <div><dt><strong>IVA</strong><small>14% sobre {formatKz(calculation.vatBase)}</small></dt><dd>{formatKz(calculation.vat)}</dd></div>
            {calculation.anttFee > 0 && <div className="sector-fee"><dt><strong>Autorização ANTT</strong><small>Taxa publicada para a categoria</small></dt><dd>{formatKz(calculation.anttFee)}</dd></div>}
          </dl>

          <div className="result-total"><span><small>IMPOSTOS E ENCARGOS ESTIMADOS</small><strong>{formatKz(calculation.totalCharges)}</strong></span><span><small>CUSTO COM CIF</small><b>{formatKz(calculation.landedValue)}</b></span></div>
          <p className="result-disclaimer">Estimativa indicativa. Não inclui despachante, armazenagem, porto ou terminal, inspecção, matrícula, seguro obrigatório nem IVM anual. A AGT pode ajustar o valor aduaneiro e a classificação.</p>
        </aside>
      </div>

      <section className="credit-simulator" aria-labelledby="credit-simulator-title">
        <div className="credit-heading">
          <div>
            <p className="eyebrow">SIMULAÇÃO FINANCEIRA</p>
            <h2 id="credit-simulator-title">Crédito automóvel</h2>
            <p>Calcule uma prestação indicativa sobre o custo final da importação, com taxa anual média de 25% e valor residual zero.</p>
          </div>
          <button type="button" onClick={() => window.print()}>Imprimir simulação completa <span aria-hidden="true">↗</span></button>
        </div>

        <div className="credit-layout">
          <div className="credit-form-card">
            <div className="credit-base-value">
              <span>PREÇO FINAL DA IMPORTAÇÃO</span>
              <strong>{exchangeReady ? formatKz(calculation.landedValue) : "A aguardar taxa BNA"}</strong>
              <small>Valor aduaneiro, impostos e encargos estimados.</small>
            </div>

            <div className="credit-input-grid">
              <label className="simulator-field">
                <span>Valor da entrada</span>
                <div className="money-input"><input type="number" min="0" max={Math.round(calculation.landedValue)} step="10000" value={Math.round(credit.downPayment)} disabled={!exchangeReady} onChange={(event) => { const amount = Number(event.target.value); setDownPaymentPercent(calculation.landedValue > 0 ? Math.min(100, Math.max(0, amount / calculation.landedValue * 100)) : 0); }} /><b>AOA</b></div>
                <small>{downPaymentPercent.toLocaleString("pt-AO", { maximumFractionDigits: 1 })}% do preço final</small>
              </label>

              <label className="simulator-field">
                <span>Prazo do crédito</span>
                <select value={loanTermMonths} onChange={(event) => setLoanTermMonths(Number(event.target.value))}>
                  {[12, 24, 36, 48, 60].map((months) => <option key={months} value={months}>{months} meses · {months / 12} {months === 12 ? "ano" : "anos"}</option>)}
                </select>
                <small>Prazo máximo de 5 anos.</small>
              </label>

              <div className="credit-fixed-field">
                <span>TAXA ANUAL MÉDIA</span>
                <strong>25%</strong>
                <small>Taxa nominal usada na estimativa.</small>
              </div>

              <div className="credit-fixed-field">
                <span>VALOR RESIDUAL</span>
                <strong>0 Kz</strong>
                <small>Liquidação integral no prazo escolhido.</small>
              </div>
            </div>

            <label className="down-payment-range">
              <span><b>Ajustar entrada</b><small>0%</small><small>100%</small></span>
              <input aria-label="Percentagem de entrada" type="range" min="0" max="100" step="1" value={Math.round(downPaymentPercent)} disabled={!exchangeReady} onChange={(event) => setDownPaymentPercent(Number(event.target.value))} />
            </label>
          </div>

          <aside className="credit-result" aria-live="polite">
            <div className="credit-result-topline"><span>PLANO ESTIMADO</span><small>{loanTermMonths} PRESTAÇÕES</small></div>
            <div className="monthly-payment"><span>PRESTAÇÃO MENSAL</span><strong>{formatKz(credit.monthlyPayment)}</strong><small>Taxa mensal nominal: {(credit.monthlyRate * 100).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</small></div>
            <dl>
              <div><dt>Entrada</dt><dd>{formatKz(credit.downPayment)}</dd></div>
              <div><dt>Montante financiado</dt><dd>{formatKz(credit.financedAmount)}</dd></div>
              <div><dt>Total das prestações</dt><dd>{formatKz(credit.installmentsTotal)}</dd></div>
              <div><dt>Juros estimados</dt><dd>{formatKz(credit.interestTotal)}</dd></div>
              <div><dt>Valor residual</dt><dd>0 Kz</dd></div>
            </dl>
            <div className="credit-grand-total"><span>CUSTO TOTAL COM CRÉDITO</span><strong>{formatKz(credit.totalWithCredit)}</strong><small>Entrada + {loanTermMonths} prestações mensais.</small></div>
            <p>Simulação meramente indicativa. Não inclui comissões bancárias, imposto de selo do crédito, seguros, avaliação, abertura do processo ou outras despesas. A aprovação e a taxa efectiva dependem da instituição financeira.</p>
          </aside>
        </div>
      </section>

      <section className="simulator-legal">
        <div><p className="eyebrow">COBERTURA PAUTAL</p><h2>Capítulos 87, 88 e 89</h2><p>O simulador reúne veículos terrestres e motociclos, aeronaves e aparelhos espaciais, embarcações e estruturas flutuantes. Quando peso, potência, casco ou uso alteram a classificação, a opção é assinalada como representativa.</p></div>
        <div className="legal-sources">
          <strong>Base legal utilizada</strong>
          <a href="/pauta-aduaneira-angola-2024.pdf" target="_blank">Pauta Aduaneira 2024 · DLP n.º 1/24 <span>↗</span></a>
          <a href="https://lex.ao/docs/assembleia-nacional/2025/lei-n-o-14-25-de-30-de-dezembro/" target="_blank" rel="noreferrer">OGE 2026 · Lei n.º 14/25 <span>↗</span></a>
          <a href="https://lex.ao/docs/assembleia-nacional/2021/lei-n-o-16-21-de-19-de-julho/" target="_blank" rel="noreferrer">IEC · Lei n.º 16/21 <span>↗</span></a>
          <a href="https://lex.ao/docs/assembleia-nacional/2022/lei-n-o-8-22-de-14-de-abril/" target="_blank" rel="noreferrer">Benefícios dos eléctricos · Lei n.º 8/22 <span>↗</span></a>
          <a href="https://lex.ao/docs/assembleia-nacional/2023/lei-n-o-14-23-de-28-de-dezembro/" target="_blank" rel="noreferrer">Código do IVA actualizado <span>↗</span></a>
          <a href="https://lex.ao/docs/presidente-da-republica/2018/decreto-legislativo-presidencial-n-o-3-18-de-09-de-maio/" target="_blank" rel="noreferrer">Emolumentos e Imposto de Selo <span>↗</span></a>
          <a href="https://lex.ao/docs/presidente-da-republica/2020/decreto-presidencial-n-o-155-20-de-01-de-junho/" target="_blank" rel="noreferrer">Novos e usados · DP n.º 155/20 <span>↗</span></a>
          <a href="https://www.antt.gov.ao/pt/Servicos-Modal-Rodoviario" target="_blank" rel="noreferrer">Autorizações e taxas ANTT <span>↗</span></a>
          <a href="https://www.bna.ao/#/pt" target="_blank" rel="noreferrer">Conversor oficial de moedas · BNA <span>↗</span></a>
        </div>
      </section>
    </section>
  );
}
