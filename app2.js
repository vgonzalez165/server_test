const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { randomUUID } = require('crypto');   // Para generar un ID único de usuario

const jwt = require('jsonwebtoken');
const secret = 'S3cr3T';

let users = [];

let app = express();
app.use(bodyParser.json());
app.use(cors())

const PORT = 5000;
app.listen( PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
})


// Raíz. Muestra la página HTML
app.get("/", (req, res, next) => {
    res.sendFile( path.join(__dirname, './index.html') );
});


function generateAccessToken(username) {
    return jwt.sign( username, secret, { expiresIn: '1800s' });
  }

app.post("/login", (req, res) => {
    const {username, pass} = req.body;
    // Aquí comprobaría si las credenciales son válidas
    if (users.find((item) => item.username.toLowerCase() == username.toLowerCase() && item.pass == pass)) {
        const token = generateAccessToken({ username: req.body.username });
        res.json(token);
    } else {
        console.log("bad");
        res.status(401);
    }
})

app.get("/api/test", (req, res) => {
    const headers = req.headers;
    let decoded = jwt.verify(headers.authorization.split(' ')[1], secret);
    console.log(decoded);
})




app.post("/api/register", (req, res, next) => {
    // Estructura del JSON
    // {
    //     fullname: '',
    //     username: '',
    //     email: '',
    //     pass: '',
    //     height: '',
    //     weight: '',
    //     birthday: '',
    //     activities: ''
    // }
    // Estructura del JSON de vuelta:
    // {
    //     success: true|false,
    //     msg: '',     // ERROR: Mensaje del error
    //     code: ''     // ERROR: Código del error
    //     id: ''       // ÉXITO: identificador asignado al usuario
    // }
    
    let {fullname, username, email, pass, height, weight, birthday, activities} = req.body;

    // ERROR: algún campo está vacío
    if (!(fullname && username && email && pass && height && weight && birthday && activities)) {
        res.status(400)     // Bad request
           .json( {
                success: false,
                msg: "Alguno de los campos es incorrecto o está vacío",
                code: "001"
           });
        return;
    }

    // ERROR: el usuario que ya existe
    if ( users.find( (item) => item.username == username )) {
        res.status(409)     // Conflict
           .json( {
                success: false,
                msg: "El nombre de usuario ya existe",
                code: "002"
           })
        return;
    }

    // ÉXITO. Aquí la guardo en memoria
    const id = randomUUID();
    users.push({
        id,
        fullname,
        username,
        email,
        pass,   // Por comodidad la guardo en plano, pero habría que guardar su hash en la base de datos
        height,
        weight,
        birthday,
        activities
    })
    res.status(200)
       .json( {
            success: true,
            id,
            msg: "Se ha creado el usuario",
        } )
    }
)

app.get('/api/checkuser', (req, res) => {
    let username = req.query?.username;

    if (!username) {
        res.status(400)
           .json({
                success: false,
                msg: "No se ha indicado el nombre del parámetro"
           })
    }

    // Buscamos el nombre de usuario en la base de datos (en este caso nuestro array)
    if (users.filter( (item) => item.username == username).length == 0) {
        res.status(200) 
           .json( {
                username,
                "exists": false
        })
    } else {
        res.status(200) 
           .json( {
                username,
                "exists": true
           })
    }
})


// GET /api/users
app.get('/api/users', (req, res) => {
    res.status(200)
       .json(users);
})


// DELETE /api/users?id=XXXXX
app.delete('/api/users', (req, res) => {
    id = req.query.id;

    if (!users.find((item) => item.id == id)) {
        res.status(400)
       .json({
            success: false,
            msg: "No existe ningún usuario con ese identificador"
       })
    } else {
        users = users.filter( (item) => item.id != id );
        res.status(200)
           .json({
                success: true,
                id
           })
    }

})

// PUT /api/users
app.put('/api/user', (req, res) => {
    let {id, fullname, email, pass, height, weight, birthday, activities} = req.body;

    let user = users.find( (item) => item.id == id);
    
    if (user) {
        if (fullname) user.fullname = fullname;
        if (email) user.email = email;
        if (pass) user.pass = pass;
        if (weight) user.weight = pass;
        if (height) user.height = height;
        if (birthday) user.birthday = birthday;
        if (activities) user.activities = activities;
        res.status(200)
           .json({
                success: true
           })
    } else {
        res.status(400)
           .json({
            success: false,
            msg: "El usuario no existe"
           })
    }


})