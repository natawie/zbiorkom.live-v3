import { useEffect, useState, lazy } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useMap } from "react-map-gl";
import { io } from "socket.io-client";
import { Button } from "@mui/material";
import { FilterList, PortableWifiOff, Search, Star } from "@mui/icons-material";
import { bbox, featureCollection, point } from "@turf/turf";
import { BikeStation, City, FilterData, Stop, Vehicle } from "../util/typings";
import { Backdrop, Suspense } from "../components/Suspense";
import { getData } from "../util/api";
import cities from "../util/cities.json";

const StopMarker = lazy(() => import("../components/StopMarker"));
const VehicleMarker = lazy(() => import("../components/VehicleMarker"));
const BikeMarker = lazy(() => import("../components/BikeMarker"));
const MapStop = lazy(() => import("./MapStop"));
const MapVehicle = lazy(() => import("./MapVehicle"));
const MapBike = lazy(() => import("./MapBike"));
const Filter = lazy(() => import("./Filter"));

export default ({ city }: { city: City }) => {
    const [searchParams] = useSearchParams();
    const { state } = useLocation();
    const { current: map } = useMap();
    const navigate = useNavigate();
    const cityData = cities[city];

    const [bounds, setBounds] = useState(map?.getBounds());
    const [zoom, setZoom] = useState(map?.getZoom() || 0);
    const [bearing, setBearing] = useState(map?.getBearing())

    const [stops, setStops] = useState<Stop[]>([]);
    const [stop, setStop] = useState<Stop>();
    const [vehicles, setVehicles] = useState<Vehicle[]>();
    const [vehicle, setVehicle] = useState<Vehicle>();
    const [bikes, setBikes] = useState<BikeStation[]>([]);
    const [bike, setBike] = useState<BikeStation>()

    const [filter, setFilter] = useState<FilterData>({ routes: [], types: [] });
    const filterEnabled = filter.routes.length || filter.types.length;
    const filteredVehicles = !vehicle && !stop && vehicles ? vehicles.filter(vehicle => (!filter.routes.length || filter.routes.includes(vehicle.route)) && (!filter.types.length || filter.types.includes(vehicle.type))).filter(veh => bounds?.contains({ lat: veh.location[0], lon: veh.location[1] })) : [];

    useEffect(() => {
        const socket = io("https://transitapi.me/", {
            reconnection: true,
            reconnectionAttempts: 5,
            timeout: 15000,
            query: {
                city: city
            }
        }).on("positions", setVehicles);

        let toastId: any;
        socket.io.on("reconnect", () => {
            toast.success("Wznowiono połączenie z serwerem.", {
                id: toastId
            });
            toastId = undefined;
        });
        socket.io.on("reconnect_attempt", (n) => {
            toastId = toast.loading(`Ponawiam próbę połączenia... (${n}/5)`, {
                id: toastId
            });
        });
        socket.io.on("reconnect_failed", () => toast(() => <div style={{ textAlign: "center" }}>
            <PortableWifiOff style={{ width: 50, height: 50 }} /><br />
            <b>Nie udało się wznowić połączenia z serwerem.</b><br />
            <Button variant="outlined" onClick={() => window.location.reload()}>Spróbuj ponownie</Button>
        </div>, { duration: Infinity, id: toastId }));
        socket.io.on("error", console.error);

        if (cityData.api.stops) getData("stops", city).then(setStops).catch(() => toast.error("Nie udało się pobrać przystanków."));
        if (cityData.api.bikes) getData("bikes", city).then(setBikes).catch(() => toast.error("Nie udało się pobrać stacji rowerowych."));

        map?.on("moveend", () => setBounds(map.getBounds()));
        map?.on("zoomend", () => setZoom(map.getZoom()));
        map?.on("rotate", () => setBearing(map.getBearing()));

        return () => {
            socket.disconnect();
        };
    }, []);

    const veh = searchParams.get("vehicle");
    useEffect(() => {
        if (!veh || !vehicles?.length) return setVehicle(undefined);
        let [type, id] = veh.split("/");
        let v = vehicles?.find(x => x.type === Number(type) && x.id === id.replace(/\s/g, "+"));

        if (v) setVehicle(v);
        else {
            navigate(".", { replace: true });
            toast.error(vehicle ? "Stracono połączenie z pojazdem." : "Nie znaleziono pojazdu.");
        }
    }, [veh, vehicles]);

    const st = searchParams.get("stop");
    useEffect(() => {
        if (!st || !stops.length) return setStop(undefined);
        let s = stops.find(x => x.id === st);

        if (s) setStop(s);
        else {
            navigate(".", { replace: true });
            toast.error("Nie znaleziono przystanku.");
        }
    }, [st, stops]);

    const bik = searchParams.get("bike");
    useEffect(() => {
        if (!bik || !bikes.length) return setBike(undefined);
        let b = bikes.find(x => x[0] === bik);

        if (b) {
            setBike(b);
            map?.flyTo({ center: [b[2][1], b[2][0]], duration: 0 });
        } else {
            navigate(".", { replace: true });
            toast.error("Nie znaleziono stacji.");
        }
    }, [bik, bikes]);
    
    return <>
        {!vehicles && <Backdrop />}
        <Suspense>
            {(zoom >= 15 && !vehicle && !stop) && <>
                {stops.filter(stop => !filter.types.length || filter.types.find(s => stop.type.includes(s)) != null).filter(stop => bounds?.contains({ lat: stop.location[0], lon: stop.location[1] })).map(stop => <StopMarker key={`stop-${stop.id}`} stop={stop} city={city} onClick={() => navigate(`?stop=${stop.id}`)} />)}
                {bikes.filter(bike => bounds?.contains({ lat: bike[2][0], lon: bike[2][1] })).map(bike => <BikeMarker key={`bike-${bike[0]}`} station={bike} onClick={() => navigate(`?bike=${bike[0]}`)} />)}
            </>}
            {((zoom >= 14 || (filterEnabled && filteredVehicles.length <= 100)) && !vehicle && !stop) && filteredVehicles.map(veh => <VehicleMarker key={veh.type + veh.id} vehicle={veh} city={city} mapBearing={bearing || 0} onClick={() => navigate(`?vehicle=${veh.type}/${veh.id}`)} />)}
            {vehicle && <MapVehicle city={city} vehicle={vehicle} mapBearing={bearing || 0} />}
            {stop && <MapStop city={city} stop={stop} vehicles={vehicles || []} />}
            {bike && <MapBike station={bike} />}
        </Suspense>
        <div className="mapboxgl-ctrl-top-right" style={{ top: 135 }}>
            <div className="mapboxgl-ctrl mapboxgl-ctrl-group">
                <button onClick={() => filterEnabled ? setFilter({ routes: [], types: [] }) : navigate(".", { state: "filter" })} style={{ backgroundColor: filterEnabled ? "#5aa159" : "white" }}><FilterList sx={{ fontSize: 19, marginTop: "3px" }} /></button>
                <button><Search sx={{ fontSize: 19, marginTop: "3px" }} /></button>
                <button><Star sx={{ fontSize: 19, marginTop: "3px" }} /></button>
            </div>
        </div>
        {state === "filter" && <Suspense>
            <Filter city={city} filter={filter} setFilter={setFilter} onClose={() => {
                navigate(".", { state: "", replace: true });
                let filtered = vehicles?.filter(vehicle => (!filter.routes.length || filter.routes.includes(vehicle.route)) && (!filter.types.length || filter.types.includes(vehicle.type))) || [];
                if (filterEnabled) {
                    if (filtered.length) {
                        if (filtered.length <= 100) {
                            let [minLng, minLat, maxLng, maxLat] = bbox(featureCollection(filtered.map(veh => point(veh.location))));
                            map?.fitBounds([[minLat, minLng], [maxLat, maxLng]], { duration: 0 });
                        }
                        toast.success(`Znaleziono ${filtered.length} pojazdów.`);
                    } else toast.error("Nie znaleziono żadnych pojazdów.");
                }
            }} />
        </Suspense>}
    </>;
};