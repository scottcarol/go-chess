var timer;

var ws = new WebSocket("ws://127.0.0.1:8080/ws");
ws.onclose = function (ev) {
    var newWs = new WebSocket("ws://127.0.0.1:8080/ws");
    newWs.onmessage = ws.onmessage;
    newWs.onclose = ws.onclose;
    newWs.onopen = ws.onopen;
    ws = newWs
};

ws.onopen = function (ev) {
    ws.send(JSON.stringify({
        Type: "hello",
        AggregateId: gameId
    }));
    if (document.getElementById("movesRange") == null) {
        renderBoard(-1);
        renderSlider();
    } else {
        renderBoard(document.getElementById("movesRange").value);
        renderSlider();
    }
};

ws.onmessage = function(event) {
    var board = document.getElementById("board-div");
    switch(event.data) {
        case "0":
            shake(board);
            break;
        case "1":
            renderBoard(-1);
            renderSlider()
    }
};

function renderSlider() {
    var xhr = new XMLHttpRequest();
    xhr.open(
        'GET', '/slider?game_id=' +
        gameId +
        '&last_move=-1'
    );
    xhr.onload = function () {
        if (xhr.status !== 200) {
            alert("something went wrong, sorry :(")
        } else {
            document.getElementById("slider-container").innerHTML = xhr.responseText
        }
    };
    xhr.send();
}

function renderBoard(lastMove) {
    var xhr = new XMLHttpRequest();
    xhr.open(
        'GET', '/board?game_id=' +
        gameId +
        '&last_move=' +
        lastMove
    );
    xhr.onload = function () {
        if (xhr.status !== 200) {
            shake(document.getElementById("board-div"));
        } else {
            clearInterval(timer);
            document.getElementById("board-div").innerHTML = xhr.responseText
        }
    };
    xhr.send();
}

var shake = function (element, magnitude = 16) {
    var counter = 1;
    var numberOfShakes = 15;
    var startX = 0, startY = 0
    var magnitudeUnit = magnitude / numberOfShakes;
    var randomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };


    upAndDownShake();

    function upAndDownShake() {
        if (counter < numberOfShakes) {
            element.style.transform = 'translate(' + startX + 'px, ' + startY + 'px)';
            magnitude -= magnitudeUnit;
            var randomX = randomInt(-magnitude, magnitude);
            var randomY = randomInt(-magnitude, magnitude);

            element.style.transform = 'translate(' + randomX + 'px, ' + randomY + 'px)';
            counter += 1;

            requestAnimationFrame(upAndDownShake);
        }
        if (counter >= numberOfShakes) {
            element.style.transform = 'translate(' + startX + ', ' + startY + ')';
        }
    }

};

function allowDrop(ev) {
    ev.preventDefault();
}


function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function rollback() {
    var msg = {
        Type: "rollback",
        AggregateId: gameId
    };
    xhr = new XMLHttpRequest();
    xhr.open('POST', '/board?game_id=' + gameId);
    xhr.onload = function () {
        if (xhr.status !== 201) {
            alert("bad status code")
            shake(document.getElementById("board-div"));
        }
    };
    xhr.send(JSON.stringify(msg));

}

function getPormotions(ev) {
    var elem = document.getElementById(ev.dataTransfer.getData("text"));
    var origParentNode = elem.parentNode;
    var destParentNode = ev.target.parentNode;

    xhr = new XMLHttpRequest();
    xhr.open('GET', '/promotions?target=' + origParentNode.id + "-" + destParentNode.id + "&game_id=" + gameId);
    xhr.onload = function () {
        if (xhr.status !== 200) {
            shake(document.getElementById("board-div"));
        } else {
            var images = xhr.responseText.split(",");
            if (images[0] === "") {
                shake(document.getElementById("board-div"))
            } else {
                var x = 0;

                function displayNextPromotion() {
                    x = (x === images.length - 1) ? 0 : x + 1;
                    elem.src = images[x];
                    elem.setAttribute(
                        "onClick", "promote(" + origParentNode.id + "," + destParentNode.id + ",'" + elem.src.split("-")[0].slice(-1) + "')");
                }

                function startTimer() {
                    timer = setInterval(displayNextPromotion, 1000);
                }

                destParentNode.replaceChild(elem, ev.target);
                startTimer()
            }
        }
    };
    xhr.send();
}

function promote(origPos, newPos, newPiece) {
    var msg = {
        Type: "promote",
        Data: origPos + "-" + newPos + "-" + newPiece,
        AggregateId: gameId
    };

    xhr = new XMLHttpRequest();
    xhr.open('POST', '/board?game_id=' + gameId);
    xhr.onload = function () {
        if (xhr.status !== 201) {
            alert("bad status code")
            shake(document.getElementById("board-div"));
        }
    };
    xhr.send(JSON.stringify(msg));
}

function move(ev) {
    ev.preventDefault();
    var elem = document.getElementById(ev.dataTransfer.getData("text"));
    var origParentNode = elem.parentNode;
    var destParentNode = ev.target.parentNode;
    var piece = elem.getAttribute("class");
    var pos = parseInt(destParentNode.id);
    if ((piece === "p_black" || piece === "p_white") &&
        (pos < 8 || pos > 55)) {
        getPormotions(ev)
    } else {
        var msg = {
            Type: "move",
            Data: origParentNode.id + "-" + destParentNode.id,
            AggregateId: gameId
        };

        xhr = new XMLHttpRequest();
        xhr.open('POST', '/board?game_id=' + gameId);
        xhr.onload = function () {
            if (xhr.status !== 201) {
                alert("bad status code")
                shake(document.getElementById("board-div"));
            }
        };
        xhr.send(JSON.stringify(msg));
    }
}
