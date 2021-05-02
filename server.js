const websocket = require("ws");
const express = require("express");
const path = require("path");
const fetch = require('node-fetch');
const bodyParser = require("body-parser");
const { Pool, Client } = require("pg");
const { Console } = require("console");
const { worker } = require("cluster");
const { response } = require("express");
const { resolve } = require("path");

const app = express();
const httpserver = require("http").createServer(app);

const wss = new websocket.Server({ server: httpserver });
var PORT = process.env.PORT || 8080;
httpserver.listen(PORT, () => console.log("listening on port " + PORT));

// app.get('/', (req, res) => {
//  res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });


pgconnObj = {
  host: "ec2-3-211-37-117.compute-1.amazonaws.com",
  port: 5432,
  user: "clithoykftlfbo",
  password: "79b31713aa44b6ccba4db3bcc4896c811777240f890f907ec00ebd040a1b5f3f",
  database: "d8ssbbn6mofnk9",
  ssl: {
    rejectUnauthorized: false,
  }
}
let client = null;

app.use(express.static(path.join(__dirname, "public")));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));



app.post("/login_check", (req, res) => {
  const email = req.body.emailInput;
  const pwd = req.body.pwdInput;
  console.log(email + " " + pwd);

  //connect to database and perform querry and close connection
  client = new Client(pgconnObj);
  client.connect();
  console.log("CONNECTED TO DATABASE");
  var q = `select type from applicants where email='${email}' and password='${pwd}'`;
  var result = null;
  client.query(q, (err, resul) => {
    console.log("CONNECTED TO DATABASE");
    console.log(resul, err);
    if (resul == undefined) {
      res.send("unexpected error, database connectivity failed");
    } else {
      result = resul.rows;
      console.log(result);
      if (!result.length > 0) {
        res.send("user doesnt exist");
      }
      if (result.length > 0 && result[0].type === false) {

        res.cookie("userPpEmail", email);
        res.cookie("userPpType", 0);
        client_1 = new Client(pgconnObj);
        client_1.connect();
        //select name, pet_parent_info.user_id, latitude, longitude, pet_id, pet_name from pet_parent_info join pet_info on pet_parent_info.user_id = pet_info.user_id where pet_parent_info.email = '${email}';
        var qforusername = `select name, (select count(appointments) from appointments where pet_id = (select pet_id from pet_info where user_id = (select user_id from pet_parent_info where email='${email}'))) as count ,pet_parent_info.user_id, latitude, longitude, pet_id, pet_name from pet_parent_info join pet_info on pet_parent_info.user_id = pet_info.user_id where pet_parent_info.email = '${email}'`;
        //**************************************************** */
        //get the COUNT of VET VISITS, PRESCRIPTIONS, NUMBER OF PETS
        //check whether any incomplete appointments are in appointments table for this user


        console.log("SELECTING NAME FROM DATABASE: " + qforusername);
        client_1.query(qforusername, (err, resultofname) => {

          console.log(resultofname);
          resultofnamearr = resultofname.rows;
          var ppid = resultofnamearr[0].user_id;
          var ppname = resultofnamearr[0].name;
          var userLat = resultofnamearr[0].latitude;
          var userLong = resultofnamearr[0].longitude;
          var pet_id = resultofnamearr[0].pet_id;
          var pet_name = resultofnamearr[0].pet_name;
          var count = resultofnamearr[0].count;

          client_2 = new Client(pgconnObj);
          client_2.connect();
          var qforanyApps = `select doc_info.d_name, appointments.a_date, appointments.a_time from appointments join doc_info on appointments.doc_id = doc_info.doc_id where pet_id = ${pet_id} and completion_status = false;`
          client_2.query(qforanyApps, (err, result2) => {
            console.log("LOGGING DOCSNAME AND TIME IF THERE IS ANY APPOINTMENT");
            console.log(result2);

            var docname = "", apptime = "";
            if (result2.rows !== null) {
              var currdate = new Date();
              var currdateStr = currdate.getFullYear() + "-" + (currdate.getMonth() + 1) + "-" + currdate.getDate();

              for (var i = 0; i < result2.rows.length; i++) {
                var rowdate = new Date(result2.rows[i].a_date);
                var rowdateStr = rowdate.getFullYear() + "-" + (rowdate.getMonth() + 1) + "-" + rowdate.getDate();
                if (currdateStr == rowdateStr) {
                  console.log("THE USER IS IN APPOINTMENT STATE");
                  docname = result2.rows[i].d_name;
                  apptime = result2.rows[i].a_time;
                }
              }

            }

            console.log("LOGGING DOCNAME AND APPTIME IF ANY: " + docname + " " + apptime);
            res.render("pp", { data: { ppid: ppid, ppname: ppname, count: count, userLat: userLat, userLong: userLong, petid: pet_id, petname: pet_name, docname: docname, apptime: apptime } });
            client_2.end();
          });


          client_1.end();
        });


      } else if (result.length > 0 && result[0].type === true) {
        res.cookie("userDocEmail", email);
        res.cookie("userDocType", 1);
        //**************************************************** */
        var qforgettingAllAppointments = ` select level3.appointment_id, level3.doc_id, level3.d_name, level3.d_latitude, level3.d_longitude, pet_parent_info.name, level3.pet_id, level3.pet_name, pet_parent_info.email, pet_parent_info.latitude, pet_parent_info.longitude, level3.a_date, level3.a_time, level3.completion_status from (select pet_info.pet_name, pet_info.user_id, level2.appointment_id, level2.a_date, level2.a_time, level2.doc_id, level2.pet_id, level2.completion_status, level2.d_name, level2.d_latitude, level2.d_longitude from (select level1.appointment_id, level1.a_date, level1.a_time, level1.doc_id, level1.pet_id, level1.completion_status, doc_info.d_name, doc_info.d_latitude, doc_info.d_longitude from (select appointment_id, a_date, a_time, doc_id, pet_id, completion_status from appointments) as level1 join doc_info on level1.doc_id = doc_info.doc_id where d_email='${email}') as level2 join pet_info on level2.pet_id = pet_info.pet_id) as level3 join pet_parent_info on pet_parent_info.user_id = level3.user_id order by a_time asc;`;
        client_1 = new Client(pgconnObj);
        client_1.connect();
        client_1.query(qforgettingAllAppointments, (err, resultofapps) => {
          console.log("LOGGING DATA OF APPOINTMENTS");
          console.log(resultofapps);


          var currdate = new Date();
          var currdateStr = currdate.getFullYear() + "-" + (currdate.getMonth() + 1) + "-" + currdate.getDate();
          var todaysappsArr = [];
          var previousappsArr = [];
          var docid = resultofapps.rows[0].doc_id;
          var docname = resultofapps.rows[0].d_name;
          var doclat = resultofapps.rows[0].d_latitude;
          var doclong = resultofapps.rows[0].d_longitude;



          for (var i = 0; i < resultofapps.rows.length; i++) {
            var rowdate = new Date(resultofapps.rows[i].a_date);
            var rowdateStr = rowdate.getFullYear() + "-" + (rowdate.getMonth() + 1) + "-" + rowdate.getDate();

            if (currdateStr == rowdateStr && !resultofapps.rows[i].completion_status) {
              console.log("todays date");
              todayappObj = {
                appointmentID: resultofapps.rows[i].appointment_id,
                ppname: resultofapps.rows[i].name,
                ppemail: resultofapps.rows[i].email,
                pname: resultofapps.rows[i].pet_name,
                date: rowdateStr,
                time: resultofapps.rows[i].a_time,
                userLat: resultofapps.rows[i].latitude,
                userLong: resultofapps.rows[i].longitude
              }
              todaysappsArr.push(todayappObj);
            } else {
              console.log("not todays date");
              prevappObj = {
                ppname: resultofapps.rows[i].name,
                pname: resultofapps.rows[i].pet_name,
                date: rowdateStr,
                time: resultofapps.rows[i].a_time
              }
              previousappsArr.push(prevappObj);
            }
          }
          todaysappsArr.sort((a, b) => {
            if (a.time > b.time) {
              return 1;
            } else {
              return -1;
            }
          });
          console.log("THE APPOINTMENT ARRAY OF TODAY IS: " + todaysappsArr + " AND THE SIZE OF THE ARRAY IS: " + todaysappsArr.length + "\n THE APPOINTMENT ARRAY OF PREVIOUS IS: " + previousappsArr);

          var qforavgrev = `select ROUND(AVG(rating)::numeric,1) as averagerev from reviews where doc_id = ${docid}`;
          client_2 = new Client(pgconnObj);
          client_2.connect();
          client_2.query(qforavgrev, (err, resultofavgrev) => {
            console.log("COUNTING THE AVG REV");
            console.log(resultofavgrev);
            var avgrev = resultofavgrev.rows[0].averagerev;
            res.render("test", { data: { todaysAppArr: todaysappsArr, prevAppArr: previousappsArr, docsProp: { docID: docid, docNAME: docname, docLAT: doclat, docLONG: doclong, averageRev: avgrev } } });
            client_2.end();
          });
          client_1.end()
        });




      }

    }
    client.end();
  });


});


app.post("/create_user", (req, res) => {
  var q = req.body.q;
  console.log(q);

  var userData = JSON.parse(q);

  if (userData.userType == "pp") {
    console.log(userData.name + " " + userData.email + " " + userData.pwd + " " + userData.DOB + " " + userData.phnum + " " + userData.address + " " + userData.pincode + " " + userData.petsname + " " + userData.petsdob + " " + userData.medcond + " " + userData.breed);
    let ppid = undefined;
    client = new Client(pgconnObj);

    //insert email id, type and password in applicants table
    var qforapplicants = `insert into applicants(email, type, password) values('${userData.email}', false, '${userData.pwd}')`;
    client.connect();
    console.log("INSERTING INTO APPLICANTS");
    client.query(qforapplicants, (err, result) => {

      console.log("PERFORMED INSERT INTO APPLICANTS TABLE FOR PP AND LOGGING: " + err + " " + result);
    });
    //insert uid(using select), name, dob, phnum, email, address,  zip, lat, long, propic in pet_parent_info table
    var selQforuid = `select uid from applicants where email = '${userData.email}'`;
    console.log("SELECTING UID FROM APPLICANTS");
    client.query(selQforuid, (err, result) => {
      ppid = result.rows[0].uid;
      console.log("uID AFTER SELECTING FROM APPLICANTS" + ppid);

      var qforppinfo = `insert into pet_parent_info(user_id, name, dob, phone_no, email, address, zip_code, latitude, longitude, profile_pic, location) values(${ppid}, '${userData.name}', '${userData.DOB}', ${userData.phnum}, '${userData.email}', '${userData.address}', ${userData.pincode}, 0, 0, 'null', 'null')`;
      console.log("INSERTING INTO PET_PARENT_INFO: " + qforppinfo);
      client.query(qforppinfo, (err, result) => {
        console.log("new user created, errors: " + err);

      });
      //insert petid, userid, petname, petdob, petage, age, breed, medcond, dp
      var qforpets = `insert into pet_info(user_id, pet_name, p_dob, age, breed, medical_conditions, profile_p) values(${ppid}, '${userData.petsname}', '${userData.petsdob}', 20, '${userData.breed}', '${userData.medcond}', 'null')`;
      console.log("INSERTING INTO PET_INFO: " + qforpets);
      client.query(qforpets, (err, result) => {
        console.log("new user created, errors: " + err);
        client.end();

      });
    });


  } else {
    //for doc
    console.log(userData.name + " " + userData.email + " " + userData.pwd + " " + userData.gender + " " + userData.phnum + " " + userData.address + " " + userData.prosta);
    let docid = undefined;
    client = new Client(pgconnObj);

    //insert email id, type and password in applicants table
    var qforapplicants = `insert into applicants(email, type, password) values('${userData.email}', true, '${userData.pwd}')`;
    client.connect();
    console.log("INSERTING INTO APPLICANTS");
    client.query(qforapplicants, (err, result) => {
      console.log("PERFORMED INSERT INTO APPLICANTS TABLE FOR DOC AND LOGGING: " + err + " " + result);

    });
    var selQforuid = `select uid from applicants where email = '${userData.email}'`;
    console.log("SELECTING UID FROM APPLICANTS");
    client.query(selQforuid, (err, result) => {
      docid = result.rows[0].uid;
      console.log("uID AFTER SELECTING FROM APPLICANTS" + docid);
      //insert into doc_info (d_name, d_dob, gender, d_email, d_phone_no, professional_status, d_address, d_latitude, d_longitude) values('sampledoc', '2020-01-01', 'male', 'sample@gmail.com', 9090909090, 'freelancer', 'aaa', 0, 0);
      var qfordocinfo = `insert into doc_info(doc_id, d_name, d_dob, gender, d_email, d_phone_no, professional_status, d_address, d_latitude, d_longitude, location) values(${docid}, '${userData.name}', '2020-01-01', '${userData.gender}', '${userData.email}', '${userData.phnum}', '${userData.prosta}', '${userData.address}', 0, 0, 'null')`;
      console.log("INSERTING INTO DOC_INFO: " + qfordocinfo);
      client.query(qfordocinfo, (err, result) => {
        console.log("new user created, errors: " + err);
        client.end();
      });
    });

  }

});



app.post("/docsRoute", (req, res) => {
  //reqTypes are appRegReq, appUpdateReq
  console.log(req.body);
  var choice = JSON.parse(req.body.appointmentData).reqType;

  switch (choice) {
    case 'appRegReq':
      var docid = JSON.parse(req.body.appointmentData).payload.docid;
      var petid = JSON.parse(req.body.appointmentData).payload.petid;
      var appdate = JSON.parse(req.body.appointmentData).payload.appDate;
      var apptime = JSON.parse(req.body.appointmentData).payload.appTime;
      var presc = null;
      var prescTitle = null;
      var compstat = false;
      var qfornewApp = `insert into appointments(doc_id, pet_id, a_date, a_time, prescription, completion_status, presc_title) values(${docid}, ${petid}, '${appdate}', '${apptime}', ${presc}, ${compstat}, ${prescTitle})`;
      client_1 = new Client(pgconnObj);
      client_1.connect();
      client_1.query(qfornewApp, (err, resultofapps) => {
        console.log('LOGGING WHILE INSERTING A NEW APPOITNMENT');
        console.log(err + " " + resultofapps);
        var qforappid = `select appointment_id from appointments where doc_id = ${docid} and pet_id = ${petid} and a_date = (SELECT CURRENT_DATE) and completion_status = false`;

        client_2 = new Client(pgconnObj);
        client_2.connect();
        client_2.query(qforappid, (err, resultofappid) => {
          console.log("SELECTING THE APPOINTMENT ID");
          console.log(resultofappid);
          var appidtosend = resultofappid.rows[0].appointment_id;
          res.send(`{"appId":"${appidtosend}"}`);
          client_2.end();
        });
        client_1.end();
      });


      // | doc_id | pet_id | a_date | a_time | prescription | completion_status| presc_title
      break;

    case 'appUpdateReq':
      var prescr = JSON.parse(req.body.appointmentData).payload.presc;
      var presc_title = JSON.parse(req.body.appointmentData).payload.prescTitle;
      var appid = JSON.parse(req.body.appointmentData).payload.appidtosend;
      var qforUpdateApp = `update appointments set presc_title = '${presc_title}', prescription = '${prescr}', completion_status = true where appointment_id = ${appid}`;
      client_1 = new Client(pgconnObj);
      client_1.connect();
      client_1.query(qforUpdateApp, (err, resultofapps) => {
        console.log('APPOINTMENT DONE, DOCTOR RATING LEFT');
        console.log(resultofapps + " " + err);
        client_1.end()
      });

      break;
  }

});




app.get("/usersPrescription", (req, res) => {
  //date docsname title prescription
  //select doc_info.d_name, a_date, presc_title, prescription from appointments join doc_info on appointments.doc_id = doc_info.doc_id where pet_id = (select pet_id from pet_info where user_id = 1) and completion_status = false;
  var uid = req.query.id
  console.log("LOGGIN ID OF PP TO VIEW prescriptions: " + uid);
  var qforpresc = `select doc_info.d_name, a_date, presc_title, prescription from appointments join doc_info on appointments.doc_id = doc_info.doc_id where pet_id = (select pet_id from pet_info where user_id = ${uid}) and completion_status = true`;
  client_1 = new Client(pgconnObj);
  client_1.connect();
  client_1.query(qforpresc, (err, resultofpresc) => {
    console.log('GETTING ALL THE PRESCRIPTIONS OF USER ' + uid + " LOGGING ANY ERROR IF: " + err);
    console.log(resultofpresc);
    var arrOfPresc = [];
    for (var i = 0; i < resultofpresc.rows.length; i++) {

      var prescObj = {
        docname: resultofpresc.rows[i].d_name,
        date: resultofpresc.rows[i].a_date,
        title: resultofpresc.rows[i].presc_title,
        prescription: resultofpresc.rows[i].prescription
      }
      arrOfPresc.push(prescObj);
    }

    res.render("presc", { data: { prescArr: arrOfPresc } });
    client_1.end()
  });


});

app.get("/vetVisits", (req, res) => {
  var uid = req.query.id;
  console.log("LOGGIN ID OF PP TO VIEW vet visits: " + uid);
  var qforvetvisits = `select level1.d_name, level1.a_date, level1.a_time, reviews.rating from (select appointments.appointment_id, doc_info.d_name, a_date, a_time from appointments join doc_info on appointments.doc_id = doc_info.doc_id where pet_id = (select pet_id from pet_info where user_id = ${uid}) and completion_status = true) as level1 join reviews on level1.appointment_id = reviews.appid where reviews.pp_id = ${uid};`;
  client_1 = new Client(pgconnObj);
  client_1.connect();
  client_1.query(qforvetvisits, (err, resultofvetvisits) => {
    console.log('GETTING ALL THE VET VISITS OF USER' + uid + " ERROR IF ANY " + err);
    console.log(resultofvetvisits);
    var vetvisitArr = [];
    for (var i = 0; i < resultofvetvisits.rows.length; i++) {
      var dbdate = new Date(resultofvetvisits.rows[i].a_date);
      var date = dbdate.getFullYear() + "-" + (dbdate.getMonth() + 1) + "-" + dbdate.getDate();
      var vetvisitsObj = {
        docname: resultofvetvisits.rows[i].d_name,
        date: date,
        time: resultofvetvisits.rows[i].a_time,
        rating: resultofvetvisits.rows[i].rating
      }
      vetvisitArr.push(vetvisitsObj);
    }
    res.render("vetvisits", { data: { vetvisitArr: vetvisitArr } });
    client_1.end()
  });
});







let bookReqData = null;
var clientpparr = [];
var clientdocarr = [];


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
        client = new Client(pgconnObj);
        client.connect();
        if (jsonReqForReqType["userPpType"] == 0) {
          console.log("THIS USER IS PP");
          var qfornameandid = `select user_id, name from pet_parent_info where email = '${jsonReqForReqType["userEmail"]}'`;

          client.query(qfornameandid, (err, result) => {
            var ppObj = {
              ppemail: jsonReqForReqType["userEmail"],
              ppname: result.rows[0].name,
              ppid: result.rows[0].user_id,
              Uconnection: ws,
              nearestDocsArr: null,
              DocArrmarker: 0,
            };

            console.log("VALUE OF ppObj: " + Object.values(ppObj));
            clientpparr.push(ppObj);
            console.log("VALUE OF CLIENTS EMAIL AFTER INSERTION: " + clientpparr[0].ppemail);
            console.log("LOADING THE  ppARRAY and docARRAY AFTER NEW USER CONNECTED:\npparray = " + Object.keys(clientpparr) + "\ndocarray = " + Object.keys(clientdocarr));
            client.end();
          });

        } else {
          console.log("THIS USER IS DOC");
          var qfornameandid = `select doc_id, d_name from doc_info where d_email = '${jsonReqForReqType["userEmail"]}'`;
          client.query(qfornameandid, (err, result) => {
            console.log("GETTING THE NAME AND ID OF THE DOCTOR FROM DATABASE TO STORE IN docObj: " + result + " AND ERROR: " + err);
            var docObj = {
              docEmail: jsonReqForReqType["userEmail"],
              docname: result.rows[0].d_name,
              docid: result.rows[0].doc_id,
              Uconnection: ws,
              docAvailability: true,
            };
            clientdocarr.push(docObj);
            console.log("LOADING THE  ppARRAY and docARRAY AFTER NEW USER CONNECTED:\npparray = " + Object.keys(clientpparr) + "\ndocarray = " + Object.keys(clientdocarr));
            client.end();
          });

        }

        break;

      case "book":
        console.log("RECIEVED REQUEST TO BOOK");


        bookReqData = jsonReqForReqType;
        delete bookReqData.reqType;
        bookReqData.resType = "AppReq";
        if (clientdocarr.length === 0) {
          console.log("NO DOCTOR IS FOUND SENDING NO DOC FOUND RESPONSE TO CLIENT:");
          var ppuserObj = isPpPresent(bookReqData["ppemail"]);
          ppuserObj.Uconnection.send(
            `{"resType":"gotAppRes","yourDoc":"none"}`
          );
          break;
        }


        closestDoc(10000, bookReqData.locationLat, bookReqData.locationLong).then((data) => {
          console.log("DATA OF USER FOR BOOKING APPOINTMENT: " + bookReqData);
          var ppuserObj = isPpPresent(bookReqData["ppemail"]); //just to get users object , he ll b obviously present
          ppuserObj.nearestDocsArr = aliveDocs(data); //assign docs for the pp

          if (!ppuserObj.nearestDocsArr.length == 0) {
            var currDoc = ppuserObj.nearestDocsArr[ppuserObj.DocArrmarker].docEmail; //get the email of first assigned doc
            console.log("CURRENTLY SELECTED DOCTOR FOR THE " + ppuserObj.ppemail + " : " + Object.keys(currDoc));
            currDocObj = isDocPresent(currDoc); // get the current docs object to send req
            bookReqData.docsName = currDoc;
            bookReqData.ppname = ppuserObj.ppname;
            currDocObj.Uconnection.send(JSON.stringify(bookReqData));
            console.log("UPDATING MARKER VALUE , MARKER VALUE = " + ppuserObj.DocArrmarker);
            ppuserObj.DocArrmarker++;
            console.log("UPDATED MARKER VALUE " + ppuserObj.DocArrmarker);
          } else {
            ppuserObj.Uconnection.send(
              `{"resType":"gotAppRes","yourDoc":"none"}`
            );
          }

        }).catch((err) => console.log(err));
        // var ppuser = isUserPresent(bookReqData.ppemail);

        break;

      case "docResponse":
        var responseFromDoc = jsonReqForReqType;
        console.log("RESPONSE RECIEVED FROM DOC: " + responseFromDoc);
        var choice = responseFromDoc["response"];

        switch (choice) {
          case "yes":
            var userppObj = isPpPresent(responseFromDoc["to"]);
            var docObj = isDocPresent(responseFromDoc["from"]);
            userppObj.Uconnection.send(
              `{"resType":"gotAppRes","yourDoc":"${docObj.docname}","time":"${responseFromDoc["time"]}","appId":"${responseFromDoc["appId"]}"}`);
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

      case "rateReqByDoc":
        //email of the doc sent, email of the pp: from doc to pp
        var rateReqFromDoc = jsonReqForReqType;
        var userObj = isPpPresent(rateReqFromDoc.to);
        var docObj = isDocPresent(rateReqFromDoc.from);
        userObj.Uconnection.send(`{"resType":"rateRes","yourDoc":"${docObj.docname}","docsEmail":"${docObj.docEmail}"}`);
        break;

      case "ratedReqBypp":
        //email of the doc, email of the pp, rate: from pp to doc
        var rateResFrompp = jsonReqForReqType;
        var userObj = isPpPresent(rateResFrompp.ppemail);
        var docObj = isDocPresent(rateResFrompp.docemail);
        var rateNum = rateResFrompp.rate;
        var appId = rateResFrompp.appid;
        // review_id | pp_id | doc_id | rating
        var ppid = userObj.ppid;
        var docid = docObj.docid;
        var qforreview = `insert into reviews(rating, appid, doc_id, pp_id) values(${rateNum}, ${appId}, ${docid}, ${ppid})`;
        client_1 = new Client(pgconnObj);
        client_1.connect();
        client_1.query(qforreview, (err, resultofapps) => {
          console.log('RATING DONE');
          console.log(resultofapps + " " + err);
          client_1.end()
        });


        //insert into DB
        break;


    }
  });

  //after the client closes
  ws.on("close", () => {
    console.log("client disocnnected");
    deleteClient(ws);
    console.log(
      "LOADING THE  ppARRAY and docARRAY AFTER USER DISCONNECTION:\npparray = " +
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

function aliveDocs(selectedDocsArr) {
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


async function closestDoc(threshold, userlat, userlong) {
  return new Promise((resolve, reject) => {
    var distArr = [];
    var Destinations = "";
    client = new Client(pgconnObj);
    client.connect();
    console.log("CONNECTED TO DATABASE FOR FETCHING ALL THE DOCTORS");
    var qforalldocs = `select d_email, d_latitude, d_longitude from doc_info`;
    client.query(qforalldocs, async (err, result) => {
      var allDocsArr = result.rows;
      for (var i = 0; i < allDocsArr.length; i++) {
        var lat = allDocsArr[i].d_latitude;
        var long = allDocsArr[i].d_longitude;
        Destinations += lat + "," + long;
        if (i == allDocsArr.length - 1) {
          break;
        } else {
          Destinations += ";";
        }
      }
      console.log("LOCATION OF ALL DOCTORS: " + Destinations);
      var url = "https://dev.virtualearth.net/REST/v1/Routes/DistanceMatrix?origins=" + userlat + "," + userlong + "&destinations=" + Destinations + "&travelMode=driving&o=json&key=As_2L4Xr4yamjBNJG3W0ssgeWohSvutxZhC9IcSq9RNwlv44T94ncNOIUcIFLxzA&distanceUnit=km";
      const fetch_response = await fetch(url);
      const jsonres = await fetch_response.json();

      console.log("ADDING ALL DOCTORS TO DISTANCE ARRAY");

      for (var i = 0; i < allDocsArr.length; i++) {
        var currDist = jsonres.resourceSets[0].resources[0].results[i].travelDistance;
        if (currDist < threshold) {
          var closeDocObj = {
            docEmail: allDocsArr[i].d_email,
            docDistfrompp: currDist,
            durationOfTravel: jsonres.resourceSets[0].resources[0].results[i].travelDuration
          }

          distArr.push(closeDocObj);
        }
      }
      client.end();
      console.log("RESOLVING: " + distArr);
      resolve(distArr);

    });
  })

}


//request sent by clients
//json_for_bookreq:{"reqType":"book", "ppemail":"abc@gmail.com", "time":"00:00", "type":"illness", "desc":"anything"},,,,checked
//json_for_clientRegistration: {"reqType":"register", "userEmail":"abc@gmail.com"},,,,,checked for pp
//json_for_doctorsResponse: {"reqType":"docResponse","response":"yes/no/wait"}

//response sent by server
//json_for_docs: {"resType":"AppReq", "ppname":"basil", "ppemail":"basil@gmail.com", "time":"00:00", "type":"illness", "desc":"anything"};
// //json_for_pps: {"resType":"gotAppRes","yourDoc":"selecteddoc"};
