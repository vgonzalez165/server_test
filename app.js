const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');   // Para generar un ID único de usuario

const secret = 'This 1s S3cr3T';

// Base de datos de usuarios. Por comodidad ya hay uno precargado
let users = [
    {
        id: '10b69d2b-26c6-4715-b510-eba42f9766f0',
        username: 'victor',
        fullname: 'Víctor J. González',
        pass: '1234',
        email: 'victor@mail.com',
        height: 170,
        weight: 70,
        birthday: '01/01/2000',
        activities: ['trail'],
        active: true
    },
    {
        id: '10b69d2b-26c6-4715-b510-eba42f9767f0',
        username: 'pepe',
        fullname: 'Pepe Fernández ',
        pass: '1234',
        email: 'pepe@mail.com',
        height: 170,
        weight: 70,
        birthday: '01/01/2000',
        activities: ['trail'],
        active: true
    }
];     


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
    return jwt.sign(username, secret, { expiresIn: '86400s' }); // Caducidad de 1 día
  }

app.post("/api/login", (req, res) => {
    const {username, pass} = req.body;
    let user = users.find( (item) => item.username.toLowerCase() == username.toLowerCase() && item.pass == pass);
    if ( user ) {
        const token = generateAccessToken({ username: req.body.username });
        res.status(200).json({
            success: true,
            username,
            id: user.id,
            token
        });
    } else {
        res
            .status(401)
            .json({
                success: 'false',
                msg: 'Credenciales no válidas'
            })
    }
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
        activities,
        active: true
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
       .json(users.filter( (item) => item.active ));
})



function isValidToken(token, username) {
    try {
        const json = jwt.verify(token, secret);
        return (json.username == username);
    } catch (e) {
        return false;
    }
}


// DELETE /api/users?id=XXXXX  || /api/users?username=XXXX
app.delete('/api/users', (req, res) => {

    let {id} = req.query;
    let {username} = req.query;
    let token = req.headers.authorization;
    let user;
    if (id) {
        user = users.find( (item) => item.id == id && item.active );
    } else if (username) {
        user = users.find( (item) => item.username == username && item.active );
    } else {
        res.status(400).json({
            success: false,
            msg: "Falta el id o el nombre del usuario"
        })
        return;
    }

    console.log("------")
    if (!isValidToken(token, user.username)) {
        res.status(401).json({
            success: false,
            msg: "Token no válido"
        });
        return;
    }

    if (user) {
        user.active = false;
        res.status(200).json({
            success: true,
            msg: "Se ha eliminado correctamente el usuario"
        })
    } else {
        res.status(404).json({
            success: false,
            msg: "No se ha encontrado el usuario"
        })
    }


    // if (!users.find((item) => item.id == id)) {
    //     res.status(400)
    //    .json({
    //         success: false,
    //         msg: "No existe ningún usuario con ese identificador"
    //    })
    // } else {
    //     users = users.filter( (item) => item.id != id );
    //     res.status(200)
    //        .json({
    //             success: true,
    //             id
    //        })
    // }

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