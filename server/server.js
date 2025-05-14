import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fs from "fs";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

// Soporte para __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

const TAGS_FILE = path.join(__dirname, "tags.json");

let tagStore = {};
if (fs.existsSync(TAGS_FILE)) {
  tagStore = JSON.parse(fs.readFileSync(TAGS_FILE, "utf-8"));
}

app.get("/", (req, res) => {
  res.send("API de procesamiento de videos");
});

app.post("/procesar-videos", async (req, res) => {
  const data = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../resources/videos-scrap.json"),
      "utf-8"
    )
  );

  for (const fechaObj of data) {
    const fecha = fechaObj.fecha;
    const videos = fechaObj.videos;

    const nuevosVideos = videos.filter((v) => !v.tag);

    if (nuevosVideos.length > 0) {
      const titulos = nuevosVideos.map((v) => v.titulo).join("\n");

      const prompt = `Asigna una etiqueta (tag) temática para cada uno de los siguientes títulos de video:\n\n${titulos}\n\nFormato de respuesta:\n- [Título]: [Tag]`;

      try {
        const response = await axios.post(
          "https://models.github.ai/inference/chat/completions",
          {
            model: "openai/gpt-4.1-nano",
            temperature: 1,
            top_p: 1,
            messages: [
              {
                role: "system",
                content:
                  "Eres un modelo que asigna etiquetas temáticas a títulos de videos musicales.",
              },
              { role: "user", content: prompt },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.VITE_OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        const resultado = response.data.choices[0].message.content;

        const lineas = resultado.split("\n");
        for (const linea of lineas) {
          const match = linea.match(/- (.+?): (.+)/);
          if (match) {
            const [, titulo, tag] = match;
            tagStore[titulo.trim()] = tag.trim();
          }
        }

        fs.writeFileSync(TAGS_FILE, JSON.stringify(tagStore, null, 2));
      } catch (error) {
        console.error("Error al llamar a la IA:", error.message);
        return res.status(500).json({ error: "Error en la API de IA" });
      }
    }

    for (const video of videos) {
      if (!video.tag && tagStore[video.titulo]) {
        video.tag = tagStore[video.titulo];
      }
    }
  }

  res.setHeader("Content-Disposition", 'attachment; filename="datos.json"');
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(data, null, 2)); // formateado opcionalmente
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
