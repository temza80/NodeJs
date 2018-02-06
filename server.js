var http = require('http'),
    fs = require('fs'),
    async = require('async');
	url = require('url'),
    mysql = require('mysql'),
    PDFDocument = require('pdfkit');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1',
    database: 'node'
});
connection.connect();
fs.readFile('./1.jpg', function(err, file) {
    if (err) {
        console.log(err);
        return;
    } else {
        async.waterfall([ //заполнение тестовыми значениями, если их нет
            function(callback) {
                var query = "SELECT * from user WHERE firstName='Ivan'";
                connection.query(query, callback);
            },
            function(rows, fields, callback) {
                if (rows == 0) {
                    var query = "INSERT INTO `user` SET ?",
                        values = {
                            firstName: 'Ivan',
                            lastName: 'Ivanov',
                            image: file,
                            pdf: 'DEFAULT'
                        };
                    connection.query(query, values, callback)
                }
            },
        ], function(err, result) {
            if (err) console.log(err);
            else console.log(result)
        });
    }
});

function nameToPdf(name, cb) {
    fs.open('output.pdf', 'w', function(err, fd) {
        if (err) return cb(err);
        async.waterfall([
            function(callback) { //поиск в базе
                var query = "SELECT * from user WHERE firstName='" + name + "'";
                connection.query(query, callback);
            },
            function(rows, fields, callback) { //создание pdf
                console.log(rows);

                doc = new PDFDocument;

                var stream = fs.createWriteStream('', {
                    fd: fd
                });
                doc.pipe(stream);

                doc.fontSize(15);
                if (typeof rows[0] != 'undefined') {//костыль, по неясной мне причинне выбрасывало ошибку, хотя файл формировался правильно
                    doc.text(rows[0].firstname + ' ' + rows[0].lastname).image(rows[0].image);
                }

                doc.end();
                stream.on('finish', function(err) {
                    if (err) console.log(err);
                    else callback(null)
                });

            },
            function(callback) //сохранение pdf

            {
                fs.readFile('output.pdf', function(err, file) {
                    if (err) console.log(err);
                    var query = "UPDATE user  SET ?  WHERE firstName='" + name + "'",
                        values = {
                            pdf: file
                        };
                    connection.query(query, values, callback);
                });
            },
        ], cb);
    });
}

http.createServer(function(request, response) {



    var query = url.parse(request.url).query //клиентского кода нет, поэтому значение берется из query (localhost:3000/?Ivan)
    nameToPdf(query, function(err, result) {
        if (err) var resp = {
            'result': false
        } //в случае ошибки
        else var resp = {
            'result': true
        }
        response.writeHead(200, {
            "Content-Type": "text/plain"
        });

        response.end(JSON.stringify(resp));
    });


}).listen(3000);

