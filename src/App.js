import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Paho from "paho-mqtt";
import "leaflet/dist/leaflet.css";
import { ToastContainer, toast, Bounce } from "react-toastify";
import L from "leaflet";

const MQTT_BROKER = "wss://test.mosquitto.org:8081/mqtt"; // Default broker
const MQTT_TOPIC = "ENG551/Ashraful/my_temperature";

const toast_config = {
    position: "top-right",
    autoClose: 1000,
    hideProgressBar: false,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
    transition: Bounce,
};

// Defined custom icons for -14 to 10 temperature ranges
const blueIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Defined custom icons for 10 to 30 temperature ranges
const greenIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Defined custom icons for 30 to 60 temperature ranges
const redIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const App = () => {
    const [location, setLocation] = useState(null);
    const [connected, setConnected] = useState(false);
    const [temperature, setTemperature] = useState(null);
    const [mqttClient, setMqttClient] = useState(null);
    const [clientText, setClientText] = useState({
        topic: "",
        message: "",
    });

    useEffect(() => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }
        navigator.geolocation.watchPosition(
            (pos) => {
                setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => console.error(err),
            { enableHighAccuracy: true },
        );
    }, []);

    const connectMQTT = () => {
        if (connected) return;

        const client = new Paho.Client(MQTT_BROKER, "clientId-" + Math.random().toString(16).substr(2, 8));

        client.onConnectionLost = (responseObject) => {
            console.log("MQTT Connection Lost:", responseObject.errorMessage);

            setTimeout(() => {
                toast.info("Connection lost, trying to reconnect", toast_config);
                client.connect({
                    onSuccess: () => {
                        console.log("Reconnected to MQTT");
                        client.subscribe(MQTT_TOPIC);
                    },
                    onFailure: (err) => console.log("Reconnect Failed", err),
                    useSSL: true,
                });
            }, 3000); // Retry after 3 seconds
            setConnected(false);
        };

        client.onMessageArrived = (message) => {
            console.log("Received MQTT message:", message.payloadString);
            toast.info("A new message received", toast_config);
            try {
                const data = JSON.parse(message.payloadString);
                setTemperature(data.properties.temp);
                setLocation({
                    lat: data.geometry.coordinates[1],
                    lng: data.geometry.coordinates[0],
                });
            } catch (error) {
                console.error("Error parsing MQTT message:", error);
            }
        };

        client.connect({
            onSuccess: () => {
                console.log("MQTT Connected");
                toast.success("Connected", toast_config);
                setConnected(true);
                client.subscribe(MQTT_TOPIC);
            },
            onFailure: (err) => {
                console.log("MQTT Connection Failed", err);
                setConnected(false);
                toast.error("Disconnected", toast_config);
            },
            useSSL: true,
        });

        setMqttClient(client);
    };

    const disconnectMQTT = () => {
        if (mqttClient) {
            mqttClient.disconnect();
            setConnected(false);
            console.log("MQTT Disconnected");
            toast.error("Disconnected", toast_config);
        }
    };

    const postMessage = (topic, msg, type) => {
        if (mqttClient && location) {
            let message = "";
            if (type === "share") {
                const temp = Math.floor(Math.random() * 60) - 20;
                const geojson = {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [location.lng, location.lat] },
                    properties: { temp: temp },
                };
                message = new Paho.Message(JSON.stringify(geojson));
                message.destinationName = MQTT_TOPIC;
            } else {
                message = new Paho.Message(JSON.stringify(msg));
                message.destinationName = "ENG551/Ashraful/" + topic;
                console.log("ENG551/Ashraful/" + topic);
            }
            mqttClient.send(message);
            toast.success("Message Added", toast_config);
        }
    };

    const getIcon = (t) => {
        if (t < 10) {
            return blueIcon;
        } else if (t >= 10 && t < 30) {
            return greenIcon;
        } else return redIcon;
    };

    return (
        <div className="flex flex-col justify-center items-center mt-12">
            <div className="flex flex-row justify-between w-3/4">
                {!connected ? (
                    <div className="flex flex-col">
                        <span>Broker: wss://test.mosquitto.org</span>
                        <span>Port : 8081</span>
                    </div>
                ) : (
                    <button
                        className="outline-2 p-1 m-2 px-4 rounded outline-black-200 text-black cursor-pointer"
                        onClick={() => postMessage(MQTT_TOPIC, "", "share")}
                    >
                        Share My Status
                    </button>
                )}
                <div>
                    <button
                        className="outline-2 p-1 mx-2 px-4 rounded outline-green-200 text-black cursor-pointer"
                        onClick={() => {
                            connectMQTT();
                        }}
                        disabled={connected}
                    >
                        Start
                    </button>
                    <button
                        className="outline-2 p-1 m-2 px-4 rounded outline-red-200 text-black cursor-pointer"
                        onClick={disconnectMQTT}
                        disabled={!connected}
                    >
                        End
                    </button>
                </div>
            </div>

            {connected && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="w-full col-span-2">
                        <MapContainer center={[51.05, -114.07]} zoom={11} style={{ height: "700px", width: "100%" }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {temperature && (
                                <Marker position={location} icon={getIcon(temperature)}>
                                    <Popup>Temperature: {temperature ?? "N/A"}°C</Popup>
                                </Marker>
                            )}
                        </MapContainer>
                    </div>
                    <div className="flex flex-col p-2 m-4">
                        <div>
                            <p className="font-bold text-xl">Pick a topic</p>
                            <div className="flex flex-row m-2">
                                <span>ENG551/Ashraful/</span>
                                <input
                                    type="text"
                                    value={clientText.topic}
                                    onChange={(e) =>
                                        setClientText((formData) => ({ ...formData, topic: e.target.value }))
                                    }
                                    placeholder="Ex: my_temperature"
                                    className="ml-1 outline-2 outline-black-200 rounded-sm px-1"
                                />
                            </div>
                        </div>
                        <div>
                            <p className="font-bold text-xl">Text Message</p>
                            <textarea
                                placeholder="Your Message ...."
                                onChange={(e) =>
                                    setClientText((formData) => ({ ...formData, message: e.target.value }))
                                }
                                value={clientText.message}
                                className="w-full outline-2 outline-black-200 rounded-sm m-2 p-2"
                            />
                        </div>
                        <button
                            onClick={() => {
                                postMessage(clientText.topic, clientText.message, "client_message");
                                setClientText({ message: "", topic: "" });
                            }}
                            className="p-1 px-4 my-2 bg-black text-white rounded-sm cursor-pointer"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            )}

            <ToastContainer />
        </div>
    );
};

export default App;
