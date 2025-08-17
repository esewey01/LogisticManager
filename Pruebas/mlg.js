// mlg-login.js
import fetch from "node-fetch"; // npm install node-fetch@2 si no lo tienes

const url = "https://www.mlgdev.mx/MarketPlaceApi/api/account/login";

const body = {
  email: "daniel@gmart.com.mx",
  password: "Noviembre#27",
  //idProveedor: "637392dd-4752-49c8-b458-04ed7ee4d55a" // inclúyelo aunque no lo pidan
};

(async () => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log("Respuesta del API:", data);
  } catch (error) {
    console.error("Error al conectar con MLG:", error.message);
  }
})();
