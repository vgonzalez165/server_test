const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

let app = express();
app.use(bodyParser.json());

app.listen( 3000, () => {
    console.log("Servidor ejecutándose en el puerto 3000");
})

app.get("/", (req, res, next) => {
    res.sendFile( path.join(__dirname, './index.html') );
});

app.get("/url", (req, res, next) => {
    res.json(["ASIR", "SMR", "DAW", "DAM"]);
});

app.post("/test/:id", (req, res) => {
    let data = {
        status: "ok",
        headers: req.headers,
        params: req.params,
        query: req.query
    };
    res .status(200)
        .json( data )
});




app.get("/test/:id", (req, res) => {
    let data = {
        name: "Testing",
        username: "Apellido",
        value: 235,
        id: req.params.id
    };
    res .status(200)
        .json ( data );
})

app.post("/register", (req, res, next) => {
    // Suponemos que el usuario victor ya existe
    let data = req.body;

    if ( data.name == "victor") {
        res
            .status(400)
            .json({
                success: false,
                msg: "El usuario ya existe",
                username: data.name
            })
    }
    else {
        // Aquí se guardarían los datos en la Base de datos
        res
            .status(200)
            .json( {
                success: true,
                msg: "Se ha creado el usuario",
            } )
    }
    
})