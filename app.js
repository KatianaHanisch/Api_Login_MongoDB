require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());

const User = require("./models/User");

//Public Router
app.get("/", (req, res) => {
  res.status(200).json({ msg: "teste" });
});

//Private Router
app.get("/user/:id", checkToken, async (req, res) => {
  const id = req.params.id;

  const user = await User.findById(id, "-password");

  if (!user) {
    return res.status(404).json({ msg: "Usuário não encontrado" });
  }

  res.status(200).json({ user });
});

function checkToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      msg: "Acesso Negado",
    });
  }

  try {
    const secret = process.env.SECRET;
    jwt.verify(token, secret);
    next();
  } catch (erro) {
    res.status(400).json({ msg: "Token Inválido" });
  }
}
//create user
app.post("/auth/register", async (req, res) => {
  const { name, email, password, confirmpassword } = req.body;

  if (!name) {
    return res.status(422).json({
      msg: "O nome é obrigatório",
    });
  }
  if (!email) {
    return res.status(422).json({
      msg: "O email é obrigatório",
    });
  }
  if (!password) {
    return res.status(422).json({
      msg: "O password é obrigatório",
    });
  }
  if (password !== confirmpassword) {
    return res.status(422).json({
      msg: "As senhas não conferem",
    });
  }

  const userExists = await User.findOne({ email: email });

  if (userExists) {
    return res.status(422).json({
      msg: "Usuário existente",
    });
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = new User({
    name,
    email,
    password: passwordHash,
  });

  try {
    await user.save();
    res.status(201).json({ msg: "Usuário criado com sucesso" });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ msg: "Aconteceu um erro" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(422).json({
      msg: "O email é obrigatório",
    });
  }
  if (!password) {
    return res.status(422).json({
      msg: "O password é obrigatório",
    });
  }

  const user = await User.findOne({ email: email });

  if (!user) {
    return res.status(404).json({
      msg: "Usuário não existente",
    });
  }

  const checkPassword = await bcrypt.compare(password, user.password);

  if (!checkPassword) {
    return res.status(422).json({
      msg: "Senha inválida",
    });
  }

  try {
    const secret = process.env.SECRET;
    const token = jwt.sign(
      {
        id: user._id,
      },
      secret
    );

    res.status(200).json({ msg: "Autenticação realizada com sucesso", token });
  } catch (erro) {
    (erro) => console.log(erro);
    res.status(500).json({ msg: "Aconteceu um erro" });
  }
});

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;

mongoose
  .connect(
    `mongodb+srv://${dbUser}:${dbPass}@cluster0.ctoj7wl.mongodb.net/?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(3333);
    console.log("Conectou a banco");
  })
  .catch((erro) => {
    console.log(erro);
  });
