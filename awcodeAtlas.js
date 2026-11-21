
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Configuración de Express
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Modelos de MongoDB
const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema);

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);

// Tareas de ejemplo
const defaultItems = [
  { name: "Welcome to your todolist!" },
  { name: "Hit the + button to add a new item." },
  { name: "<-- Hit this to delete an item." }
];

// RUTA PRINCIPAL: TODAY
app.get("/", async (req, res) => {
  try {
    const foundItems = await Item.find({});

    if (foundItems.length === 0) {
      await Item.insertMany(defaultItems);
      return res.redirect("/");
    }

    // Consultar todas las listas de MongoDB Atlas
    const allLists = await List.find({})
      .sort({ name: 1 });

    return res.render("list", {
      listTitle: "Today",
      newListItems: foundItems,
      allLists: allLists
    });

  } catch (err) {
    console.error("Error en la lista principal:", err);
    return res.status(500).send(
      "Error al recuperar las tareas"
    );
  }
});

// RUTA INFORMATIVA
app.get("/about", (req, res) => {
  res.render("about");
});

// RUTAS DE LISTAS PERSONALIZADAS
app.get("/:customListName", async (req, res) => {
  const customListName = _.capitalize(
    req.params.customListName
  );

  if (customListName === "Today") {
    return res.redirect("/");
  }

  try {
    let foundList = await List.findOne({
      name: customListName
    });

    // Crear lista si todavía no existe
    if (!foundList) {
      foundList = new List({
        name: customListName,
        items: defaultItems
      });

      await foundList.save();
    }

    // Obtener todas las listas para el desplegable
    const allLists = await List.find({})
      .sort({ name: 1 });

    return res.render("list", {
      listTitle: foundList.name,
      newListItems: foundList.items,
      allLists: allLists
    });

  } catch (err) {
    console.error("Error al abrir la lista:", err);
    return res.status(500).send(
      "Error al recuperar la lista"
    );
  }
});

// AÑADIR TAREAS
app.post("/", async (req, res) => {
  const itemName = (req.body.newItem || "").trim();
  const listName = req.body.list;

  if (!itemName) {
    return res.redirect(
      listName === "Today"
        ? "/"
        : "/" + encodeURIComponent(listName || "")
    );
  }

  try {
    if (listName === "Today") {
      await Item.create({ name: itemName });
      return res.redirect("/");
    }

    const foundList = await List.findOne({
      name: listName
    });

    if (!foundList) {
      return res.status(404).send(
        "Lista no encontrada"
      );
    }

    foundList.items.push({ name: itemName });
    await foundList.save();

    return res.redirect(
      "/" + encodeURIComponent(listName)
    );

  } catch (err) {
    console.error("Error al guardar la tarea:", err);
    return res.status(500).send(
      "Error al guardar la tarea"
    );
  }
});

// ELIMINAR TAREAS
app.post("/delete", async (req, res) => {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  try {
    if (listName === "Today") {
      await Item.findByIdAndDelete(checkedItemId);
      return res.redirect("/");
    }

    await List.findOneAndUpdate(
      { name: listName },
      {
        $pull: {
          items: { _id: checkedItemId }
        }
      }
    );

    return res.redirect(
      "/" + encodeURIComponent(listName)
    );

  } catch (err) {
    console.error("Error al eliminar la tarea:", err);
    return res.status(500).send(
      "Error al eliminar la tarea"
    );
  }
});

// CONEXIÓN A MONGODB ATLAS Y ARRANQUE
async function start() {
  if (!MONGODB_URI) {
    console.error(
      "Falta configurar la variable MONGODB_URI"
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "todolistDB"
    });

    console.log("Conectado a MongoDB Atlas");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        "Servidor iniciado en el puerto " + PORT
      );
    });

  } catch (err) {
    console.error(
      "No se pudo conectar a MongoDB Atlas:",
      err.message
    );
    process.exit(1);
  }
}

start();
