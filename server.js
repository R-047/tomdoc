const websocket = require("ws");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { Pool, Client } = require("pg");
const { Console } = require("console");
const { worker } = require("cluster");
const { response } = require("express");
const { resolve } = require("path");

const app = express();
const httpserver = require("http").createServer(app);

const wss = new websocket.Server({ server: httpserver });
var PORT = process.env.PORT || 8082;
httpserver.listen(PORT, () => console.log("listening on port " + PORT));

// app.get('/', (req, res) => {
//  res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

//change the values
const client = new Client({
  host: "ec2-3-211-37-117.compute-1.amazonaws.com",
  port: 5432,
  user: "clithoykftlfbo",
  password: "79b31713aa44b6ccba4db3bcc4896c811777240f890f907ec00ebd040a1b5f3f",
  database: "d8ssbbn6mofnk9",
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.urlencoded({ extended: false }));
app.post("/login_check", (req, res) => {
  const email = req.body.emailInput;
  const pwd = req.body.pwdInput;
  console.log(email + " " + pwd);

 //connect to database and perform querry and close connection
      client.connect();
      console.log("CONNECTED TO DATABASE");
      var q = `select type from applicants where email='${email}' and password='${pwd}'`;
      client.query(q, (err, resul) => {
        console.log("CONNECTED TO DATABASE");
        // if(err) throw err;
        console.log(resul);
        result = resul.rows;
        client.end();
      });

      console.log(result);
      if (!result.length > 0) {
        res.send("user doesnt exist");
      }
      if (result.length > 0 && result[0].type === 0) {
        res.sendFile(path.join(__dirname, "public", "pp.html"));
        res.cookie("userPpEmail", email);
        res.cookie("userPpType", 0);
      } else if (result.length > 0 && result[0].type === 1) {
        res.sendFile(path.join(__dirname, "public", "doc.html"));
        res.cookie("userDocEmail", email);
        res.cookie("userDocType", 1);
      }
    
});

app.post("/create_user", (req, res) => {
  const cfullname = req.body.Fullname;
  const cemailId = req.body.email;
  const cpassword = req.body.password;
  const cphnumber = req.body.Phonenumber;
  const cage = req.body.Age;
  const caddressline1 = req.body.Addressline1;
  const caddressline2 = req.body.Addressline2;
  const cccity = req.body.CityDistrict;
  const cstate = req.body.State;
  const loclat = 0000;
  const loclong = 0000;
  const locname = "none";
  const type = 0;

  console.log(
    cfullname +
      " " +
      cemailId +
      " " +
      cpassword +
      " " +
      cphnumber +
      " " +
      cage +
      " " +
      caddressline1 +
      " " +
      caddressline2 +
      " " +
      cccity +
      " " +
      cstate
  );

  //connect to database and perform querry and close connection
  client.connect();
  var q = `insert into applicants(email, type, loclat, loclong, password, locationname) values('${cemailId}', ${type}, ${loclat}, ${loclong}, '${cpassword}', '${locname}')`;
  client.query(q, (err, result) => {
    if (err) throw err;
    res.sendFile(path.join(__dirname, "public", "loginActual.html"));
    client.end();
  });


});

let bookReqData = null;
var clientpparr = [];
var clientdocarr = [];
// var clientsArr = [];
const selectedDocsArr = [
  {
    docEmail: "ishita@gmail.com",
  },
  {
    docEmail: "jai@gmail.com",
  },
  {
    docEmail: "cathy@gmail.com",
  },
];
for (i = 0; i < selectedDocsArr.length; i++) {
  console.log(selectedDocsArr[i].docEmail);
}

//WEBSOCKETS //*****************************************************************
wss.on("connection", (ws) => {
  console.log("NEW CLIENT CONNECTED\n");

  //   //send any data
  //   ws.on("open", () => {
  //     // ws.send();
  //   });

  //recieve any data
  ws.on("message", (data) => {
    console.log("RECIEVED A MESSAGE: " + data);
    var jsonReqForReqType = JSON.parse(data); //format:{"reqType":"register", "userEmail":"abc@gmail.com"}/{"reqType":"book", "ppemail":"abc@gmail.com", "time":"00:00"}
    var choice = jsonReqForReqType["reqType"];

    switch (choice) {
      case "register":
        console.log(
          "REQUEST FOR USER REGISTRATION BY USER EMAIL:\n" +
            jsonReqForReqType["userEmail"]
        );
        if (jsonReqForReqType["userPpType"] == 0) {
          console.log("THIS USER IS PP");
          var fk = jsonReqForReqType["userEmail"];
          var ppObj = {
            ppemail: jsonReqForReqType["userEmail"],
            Uconnection: ws,
            nearestDocsArr: null,
            DocArrmarker: 0,
          };
          console.log("VALUE OF ppObj: " + Object.values(ppObj));
          clientpparr.push(ppObj);
          console.log(
            "VALUE OF CLIENTS EMAIL AFTER INSERTION: " + clientpparr[0].ppemail
          );
        } else {
          console.log("THIS USER IS DOC");
          var docObj = {
            docEmail: jsonReqForReqType["userEmail"],
            Uconnection: ws,
            docAvailability: true,
          };
          clientdocarr.push(docObj);
        }
        //create an object having email and connection field
        console.log(
          "LOADING THE  ppARRAY and docARRAY AFTER NEW USER CONNECTED:\npparray = " +
            Object.keys(clientpparr) +
            "\ndocarray = " +
            Object.keys(clientdocarr)
        );
        break;

      case "book":
        bookReqData = jsonReqForReqType;
        delete bookReqData.reqType;
        bookReqData.resType = "AppReq";
        if (clientdocarr.length === 0) {
          var ppuserObj = isPpPresent(bookReqData["ppemail"]);
          ppuserObj.Uconnection.send(
            `{"resType":"gotAppRes","yourDoc":"none"}`
          );
          break;
        }
        // var ppuser = isUserPresent(bookReqData.ppemail);
        console.log("DATA OF USER FOR BOOKING APPOINTMENT: " + bookReqData);
        var ppuserObj = isPpPresent(bookReqData["ppemail"]); //just to get users object , he ll b obviously present
        ppuserObj.nearestDocsArr = aliveDocs(); //assign docs for the pp
        var currDoc = ppuserObj.nearestDocsArr[ppuserObj.DocArrmarker].docEmail; //get the email of first assigned doc
        console.log(
          "CURRENTLY SELECTED DOCTOR FOR THE " +
            ppuserObj.ppemail +
            " : " +
            Object.keys(currDoc)
        );
        currDocObj = isDocPresent(currDoc); // get the current docs object to send req
        bookReqData.docsName = currDoc;
        currDocObj.Uconnection.send(JSON.stringify(bookReqData));
        console.log(
          "UPDATING MARKER VALUE , MARKER VALUE = " + ppuserObj.DocArrmarker
        );
        ppuserObj.DocArrmarker++;
        console.log("UPDATED MARKER VALUE " + ppuserObj.DocArrmarker);
        break;

      case "docResponse":
        var responseFromDoc = jsonReqForReqType;
        console.log("RESPONSE RECIEVED FROM DOC: " + responseFromDoc);
        var choice = responseFromDoc["response"];

        switch (choice) {
          case "yes":
            var userppObj = isPpPresent(responseFromDoc["to"]);
            userppObj.Uconnection.send(
              `{"resType":"gotAppRes","yourDoc":"${responseFromDoc["from"]}"}`
            );
            userppObj.DocArrmarker = 0;
            break;

          case "no":
            var userppObj = isPpPresent(responseFromDoc["to"]);
            var usermarkerVal = userppObj.DocArrmarker;
            var userdocarrLen = userppObj.nearestDocsArr.length;
            console.log(
              "MARKER VALUE = " +
                usermarkerVal +
                " LENGTH OF ARR: " +
                userdocarrLen
            );

            if (usermarkerVal >= userdocarrLen) {
              console.log("NO DOC FOUND REACHED THE END OF nearestDocArr");
              userppObj.Uconnection.send(
                `{"resType":"gotAppRes","yourDoc":"none"}`
              );
              userppObj.DocArrmarker = 0;
            } else {
              console.log("SENDING REQUEST TO NEXT DOC IN THE ARRAY");
              var currdocemail =
                userppObj.nearestDocsArr[userppObj.DocArrmarker].docEmail;
              var userdocObj = isDocPresent(currdocemail);
              bookReqData.docsName = currdocemail;
              userdocObj.Uconnection.send(JSON.stringify(bookReqData));
              console.log(
                "UPDATING MARKER VALUE , MARKER VALUE = " +
                  userppObj.DocArrmarker
              );
              userppObj.DocArrmarker++;
              console.log("UPDATED MARKER VALUE " + userppObj.DocArrmarker);
            }
            break;

          case "wait":
            var userppObj = isPpPresent(responseFromDoc["to"]);
            var usermarkerVal = userppObj.DocArrmarker;
            var userdocarrLen = userppObj.nearestDocsArr.length;
            console.log(
              "MARKER VALUE = " +
                usermarkerVal +
                " LENGTH OF ARR: " +
                userdocarrLen
            );

            if (usermarkerVal >= userdocarrLen) {
              console.log("NO DOC FOUND REACHED THE END OF nearestDocArr");
              userppObj.Uconnection.send(
                `{"resType":"gotAppRes","yourDoc":"none"}`
              );
              userppObj.DocArrmarker = 0;
            } else {
              console.log("SENDING REQUEST TO NEXT DOC IN THE ARRAY");
              var currdocemail =
                userppObj.nearestDocsArr[userppObj.DocArrmarker].docEmail;
              var userdocObj = isDocPresent(currdocemail);
              bookReqData.docsName = currdocemail;
              userdocObj.Uconnection.send(JSON.stringify(bookReqData));
              console.log(
                "UPDATING MARKER VALUE , MARKER VALUE = " +
                  userppObj.DocArrmarker
              );
              userppObj.DocArrmarker++;
              console.log("UPDATED MARKER VALUE " + userppObj.DocArrmarker);
            }
            break;
        }
        break;
    }
  });

  //after the client closes
  ws.on("close", () => {
    console.log("client disocnnected");
    deleteClient(ws);
    console.log(
      "LOADING THE  ppARRAY and docARRAY AFTER NEW USER CONNECTED:\npparray = " +
        Object.keys(clientpparr) +
        "\ndocarray = " +
        Object.keys(clientdocarr)
    );
  });
});
//*****************************************************************

//function to check whether a user is in the client list, parameters:- useremail; returns:- if found the obj will be returned else null
function isPpPresent(UserEmail) {
  console.log("CHECKING IF " + UserEmail + " IS PRESENT IN PP ARRAY");
  for (var i = 0; i < clientpparr.length; i++) {
    if (clientpparr[i].ppemail === UserEmail) {
      console.log("RETURNING " + UserEmail + " OBJECT BECAUSE USER WAS FOUND");
      return clientpparr[i];
    }
  }
  console.log(UserEmail + " NOT FOUND IN PP ARRAY, RETURNING NULL");
  return null;
}

function isDocPresent(UserEmail) {
  console.log("CHECKING IF " + UserEmail + " IS PRESENT IN DOC ARRAY");
  for (var i = 0; i < clientdocarr.length; i++) {
    if (clientdocarr[i].docEmail === UserEmail) {
      console.log("RETURNING " + UserEmail + " OBJECT BECAUSE USER WAS FOUND");
      return clientdocarr[i];
    }
  }
  console.log(UserEmail + " NOT FOUND IN DOC ARRAY, RETURNING NULL");
  return null;
}

function deleteClient(wsClient) {
  for (i = 0; i < clientpparr.length; i++) {
    if (clientpparr[i].Uconnection === wsClient) {
      clientpparr.splice(i, 1);
    }
  }
  for (i = 0; i < clientdocarr.length; i++) {
    if (clientdocarr[i].Uconnection === wsClient) {
      clientdocarr.splice(i, 1);
    }
  }
}

function sleep(milliseconds) {
  let timeStart = new Date().getTime();
  while (true) {
    let elapsedTime = new Date().getTime() - timeStart;
    if (elapsedTime > milliseconds) {
      break;
    }
  }
}

function aliveDocs() {
  console.log("INSIDE aliveDocs()");
  let aliveDocArr = [];
  for (var i = 0; i < selectedDocsArr.length; i++) {
    for (var j = 0; j < clientdocarr.length; j++) {
      console.log(
        "CHECKING IF selectedDoc " +
          selectedDocsArr[i].docEmail +
          " IS PRESENT IN clientdocarr " +
          clientdocarr[j].docEmail
      );
      if (selectedDocsArr[i].docEmail === clientdocarr[j].docEmail) {
        console.log("DOC " + selectedDocsArr[i].docEmail + " IS ALIVE");
        aliveObj = {
          docEmail: selectedDocsArr[i].docEmail,
        };
        aliveDocArr.push(aliveObj);
      }
    }
  }
  return aliveDocArr;
}

// function waitForResponse(docuser, ppuser){
//   return new Promise((resolve, reject) => {
//     let response = null;
//     docuser.Uconnection.on("message", (data) => {
//       var jsonReqForDocResponse = JSON.parse(data);
//       response = jsonReqForDocResponse["response"];
//       console.log(
//         "RESPONSE RECIEVED FROM DOCTOR: " +
//           data +
//           " RESPONSE VALUE: " +
//           response
//       );
//       if (response === "yes") {
//         console.log(
//           "RESPONSE SENT TO CLIENT WHO BOOKED APPOINTMENT " +
//             ppuser.userEmail +
//             " BECAUSE RESPONSE WAS YES\n"
//         );
//         ppuser.Uconnection.send(
//           `{"resType":"gotAppRes","yourDoc":"${docuser.userEmail}"}`
//         );
//       }
//     });
//     if(response === "yes"){
//       resolve("yes");
//       console.log("RESOLVING AS yes");

//     }else if (response === "no") {
//       //resolve("no");
//       console.log("RESOLVING AS no");

//     } else if (response === "wait") {
//       reject("wait");
//       console.log("RESOLVING AS wait");

//     }

//   })
//}

//request sent by clients
//json_for_bookreq:{"reqType":"book", "ppemail":"abc@gmail.com", "time":"00:00", "type":"illness", "desc":"anything"},,,,checked
//json_for_clientRegistration: {"reqType":"register", "userEmail":"abc@gmail.com"},,,,,checked for pp
//json_for_doctorsResponse: {"reqType":"docResponse","response":"yes/no/wait"}

//response sent by server
//json_for_docs: {"resType":"AppReq", "ppname":"basil", "ppemail":"basil@gmail.com", "time":"00:00", "type":"illness", "desc":"anything"};
// //json_for_pps: {"resType":"gotAppRes","yourDoc":"selecteddoc"};
