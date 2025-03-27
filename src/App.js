import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Paho from "paho-mqtt";
import "leaflet/dist/leaflet.css";

const MQTT_BROKER = "wss://test.mosquitto.org:8081/mqtt"; // Default broker
const MQTT_TOPIC = "ENG551/Ashraful/my_temperature";

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
            setConnected(false);
        };

        client.onMessageArrived = (message) => {
            console.log("Received MQTT message:", message.payloadString);
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
                setConnected(true);
                client.subscribe(MQTT_TOPIC);
            },
            onFailure: (err) => {
                console.log("MQTT Connection Failed", err);
                setConnected(false);
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
                message = new Paho.Message(msg);
                message.destinationName = "ENG551/Ashraful/" + topic;
            }
            mqttClient.send(message);
        }
    };

    return (
        <div className="container flex justify-center items-center">
            <div className="flex flex-row justify-between w-100">
                {!connected ? (
                    <div className="flex flex-col">
                        <span>Broker: wss://test.mosquitto.org</span>
                        <span>Port : 8081</span>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <div>
                            <p>Pick a topic</p>
                            <div className="flex flex-row">
                                <span>ENG551/Ashraful/</span>
                                <input
                                    type="text"
                                    value={clientText.topic}
                                    onChange={(t) => setClientText({ topic: t })}
                                    placeholder="Ex: my_temperature"
                                ></input>
                            </div>
                        </div>
                        <div>
                            <p>Your Message</p>
                            <div>
                                <textarea
                                    placeholder="Your Message ...."
                                    onChange={(t) => setClientText({ message: t })}
                                    value={clientText.message}
                                ></textarea>
                            </div>
                        </div>
                    </div>
                )}
                <button className="bg-red-200 text-black cursor-pointer" onClick={connectMQTT} disabled={connected}>
                    Start
                </button>
                <button
                    className="bg-green-200 text-black cursor-pointer"
                    onClick={disconnectMQTT}
                    disabled={!connected}
                >
                    End
                </button>
            </div>
            <button
                className="bg-slate-200 text-black cursor-pointer"
                onClick={() => postMessage(MQTT_TOPIC, "", "share")}
            >
                Share My Status
            </button>
            <MapContainer center={[51.05, -114.07]} zoom={13} style={{ height: "400px", width: "100%" }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[51.05, -114.07]}>
                    <Popup>Temperature: {temperature ?? "N/A"}°C</Popup>
                </Marker>
            </MapContainer>
        </div>
    );
};

export default App;
