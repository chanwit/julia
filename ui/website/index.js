(function() {

// when the DOM loads
$(document).ready(function() {
    // click handler for "Try Julia Now" button
    $("a#submit_button").click(function() {
        // submit the form
        $("form#session_form").submit();
    });

    // form handler
    $("form#session_form").submit(function() {
        // validate the input
        $("input").removeClass("error");
        if ($("input#session_name").val() == "") {
            $("input#session_name").addClass("error");
            $("input#session_name").focus();
        }
        if ($("input#user_name").val() == "") {
            $("input#user_name").addClass("error");
            $("input#user_name").focus();
        }

        // send a start message
        outbox_queue.push([MSG_INPUT_START, $("input#user_name").val(), $("input#session_name").val()]);
        process_outbox();
        return false;
    });

    // focus the first input box
    $("input#user_name").focus();
});

/*
    Network Protol

    This needs to match the message
    types listed in ui/webserver/message_types.h.
*/

// input messages (to julia)
var MSG_INPUT_NULL              = 0;
var MSG_INPUT_START             = 1;
var MSG_INPUT_POLL              = 2;
var MSG_INPUT_EVAL              = 3;
var MSG_INPUT_REPLAY_HISTORY    = 4;

// output messages (to the browser)
var MSG_OUTPUT_NULL             = 0;
var MSG_OUTPUT_READY            = 1;
var MSG_OUTPUT_MESSAGE          = 2;
var MSG_OUTPUT_OTHER            = 3;
var MSG_OUTPUT_FATAL_ERROR      = 4;
var MSG_OUTPUT_PARSE_ERROR      = 5;
var MSG_OUTPUT_PARSE_INCOMPLETE = 6;
var MSG_OUTPUT_PARSE_COMPLETE   = 7;
var MSG_OUTPUT_EVAL_RESULT      = 8;
var MSG_OUTPUT_EVAL_ERROR       = 9;
var MSG_OUTPUT_PLOT             = 10;

// keep track of whether we are waiting for a message (and don't send more if we are)
var waiting_for_response = false;

// a queue of messages to be sent to the server
var outbox_queue = [];

// a queue of messages from the server to be processed
var inbox_queue = [];

// an array of message handlers
var message_handlers = [];

message_handlers[MSG_OUTPUT_NULL] = function(msg) { alert("started!"); };

// send the messages in the outbox
function process_outbox() {
    // don't make new requests if we're waiting for old ones
    if (!waiting_for_response) {
        // don't send a request if there are no messages
        if (outbox_queue.length > 0) {
            // don't send any more requests while we're waiting for this one
            waiting_for_response = true;

            // send the messages
            $.post("/repl.scgi", {"request": $.toJSON(outbox_queue)}, callback, "json");
        }

        // we sent all the messages at once so clear the outbox
        outbox_queue = [];
    }
}

// process the messages in the inbox
function process_inbox() {
    // iterate through the messages
    for (var id in inbox_queue) {
        var msg = inbox_queue[id],
            type = msg[0], msg = msg.slice(1),
            handler = message_handlers[type];
        if (typeof handler == "function")
            handler(msg);
    }

    // we handled all the messages so clear the inbox
    inbox_queue = [];
}

// called when the server has responded
function callback(data, textStatus, jqXHR) {
    // allow sending new messages
    waiting_for_response = false;

    // add the messages to the inbox
    inbox_queue = inbox_queue.concat(data);

    // process the inbox
    process_inbox();

    // send any new messages
    process_outbox();
}

})();