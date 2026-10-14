// Runs INSIDE Illustrator (ExtendScript, so plain old JavaScript: var, no JSON, no arrow functions).
// tools/textures/make-ai.js puts two lines in front of this file and starts it through AppleScript:
//     var JOB_FILE = "...";     a JSON list of { key, ai, png, w, h, notes, fs }
//     var RESULT_FILE = "...";  one line per job is written here: OK<TAB>key or FAIL<TAB>key<TAB>reason
//
// Every job becomes one RGB document, one artboard of exactly w x h points (1 pt = 1 px of the PNG), with these layers,
// bottom to top:
//     reference   the current PNG, embedded, locked          (never exported)
//     texture     empty, the layer you draw the new texture in   (exported as <name>.png)
//     height      empty, greyscale bump map                      (exported as <name>-height.png)
//     notes       hidden and non-printing, text on a white card  (never exported)

app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

function readText(path) {
  var f = new File(path);
  f.encoding = "UTF-8";
  f.open("r");
  var t = f.read();
  f.close();
  return t;
}

function appendLine(path, line) {
  var f = new File(path);
  f.encoding = "UTF-8";
  f.lineFeed = "Unix";                                  // ExtendScript writes Mac (\r) line endings unless told otherwise
  f.open("a");
  f.writeln(line);
  f.close();
}

function rgb(r, g, b) {
  var c = new RGBColor();
  c.red = r; c.green = g; c.blue = b;
  return c;
}

function build(j) {
  var doc = app.documents.add(DocumentColorSpace.RGB, j.w, j.h);
  try {
    var rect = doc.artboards[0].artboardRect;           // [left, top, right, bottom] in Illustrator's own coordinates
    var L = rect[0], T = rect[1];

    // 1. reference
    var ref = doc.layers[0];
    ref.name = "reference";
    if (j.png) {
      var placed = ref.placedItems.add();
      placed.file = new File(j.png);
      placed.embed();
      var img = ref.pageItems[0];                       // the placed item turns into a raster item when embedded
      img.width = j.w;
      img.height = j.h;
      img.position = [L, T];
    }
    ref.locked = true;

    // 2. texture and 3. height: empty on purpose
    var tex = doc.layers.add();
    tex.name = "texture";
    var hei = doc.layers.add();
    hei.name = "height";

    // 4. notes: text on a white card, hidden and non-printing
    var notes = doc.layers.add();
    notes.name = "notes";
    var card = notes.pathItems.rectangle(T, L, j.w, j.h);
    card.filled = true; card.fillColor = rgb(255, 255, 255); card.stroked = false; card.opacity = 90;
    var m = Math.max(2, Math.min(j.w, j.h) * 0.03);
    var area = notes.pathItems.rectangle(T - m, L + m, j.w - 2 * m, j.h - 2 * m);
    var tf = notes.textFrames.areaText(area);
    tf.contents = j.notes;
    var ca = tf.textRange.characterAttributes;
    ca.size = j.fs;
    ca.fillColor = rgb(20, 20, 20);
    notes.visible = false;
    notes.printable = false;

    doc.activeLayer = tex;

    var opts = new IllustratorSaveOptions();
    opts.pdfCompatible = true;                          // the converter reads the PDF inside the .ai
    opts.compressed = true;
    doc.saveAs(new File(j.ai), opts);
  } finally {
    doc.close(SaveOptions.DONOTSAVECHANGES);
  }
}

var jobs = eval("(" + readText(JOB_FILE) + ")");
for (var i = 0; i < jobs.length; i++) {
  try {
    build(jobs[i]);
    appendLine(RESULT_FILE, "OK\t" + jobs[i].key);
  } catch (e) {
    appendLine(RESULT_FILE, "FAIL\t" + jobs[i].key + "\t" + e.message + " (line " + e.line + ")");
  }
}
"done";
