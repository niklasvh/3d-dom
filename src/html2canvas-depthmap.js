function html2canvasDepthRenderer(options) {
  options = options || {};

  var depth = 0;
  var count = 0;

  var doc = document,
    safeImages = [],
    testCanvas = document.createElement("canvas"),
    testctx = testCanvas.getContext("2d"),
    canvas = options.canvas || doc.createElement('canvas');

  function createShape(ctx, args) {
    ctx.beginPath();
    args.forEach(function(arg) {
      ctx[arg.name].apply(ctx, arg['arguments']);
    });
    ctx.closePath();
  }

  function safeImage(item) {
    if (safeImages.indexOf(item['arguments'][0].src ) === -1) {
      testctx.drawImage(item['arguments'][0], 0, 0);
      try {
        testctx.getImageData(0, 0, 1, 1);
      } catch(e) {
        testCanvas = doc.createElement("canvas");
        testctx = testCanvas.getContext("2d");
        return false;
      }
      safeImages.push(item['arguments'][0].src);
    }
    return true;
  }

  function getDepthColor(color) {
    return "rgb(" + [color, 0, 0].join(",") + ")";
  }

  function renderItem(ctx, item) {
    count++;
    var color;
    var tmpStyle;
    switch(item.type){
      case "variable":
        if (item.name === "fillStyle") {
          color = depth;
          ctx.fillStyle = getDepthColor(color);
        } else if(!/(shadowColor|shadowOffsetX|shadowOffsetY|shadowBlur|globalAlpha)/.test(item.name)) {
          ctx[item.name] = item['arguments'];
        }
        break;
      case "function":
        switch(item.name) {
          case "createPattern":
            break;
          case "drawShape":
            createShape(ctx, item['arguments']);
            break;
          case "drawImage":
            break;
          case "fillText":
            tmpStyle = ctx.fillStyle;
            color = (depth + 1);
            ctx.fillStyle = getDepthColor(color);
            ctx[item.name].apply(ctx, item['arguments']);
            ctx.fillStyle = tmpStyle;
            break;
          default:
            ctx[item.name].apply(ctx, item['arguments']);
        }
        break;
    }
  }

  return function(parsedData, options, document, queue) {
    var ctx = canvas.getContext("2d"),
      fstyle,
      zStack = parsedData.stack;

    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    canvas.width = canvas.style.width =  options.width || zStack.ctx.width;
    canvas.height = canvas.style.height = options.height || zStack.ctx.height;

    fstyle = ctx.fillStyle;
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = fstyle;
    queue.forEach(function(storageContext) {
      depth = storageContext.zIndex.depth;
      // set common settings for canvas
      ctx.textBaseline = "bottom";
      ctx.save();

      if (storageContext.transform.matrix) {
        ctx.translate(storageContext.transform.origin[0], storageContext.transform.origin[1]);
        ctx.transform.apply(ctx, storageContext.transform.matrix);
        ctx.translate(-storageContext.transform.origin[0], -storageContext.transform.origin[1]);
      }

      if (storageContext.clip){
        ctx.beginPath();
        ctx.rect(storageContext.clip.left, storageContext.clip.top, storageContext.clip.width, storageContext.clip.height);
        ctx.clip();
      }

      if (storageContext.ctx.storage) {
        storageContext.ctx.storage.forEach(function(item) {
          renderItem(ctx, item);
        });
      }

      ctx.restore();
    });

     var Bounds = function (element) {
      var clientRect, bounds = {};

      if (element.getBoundingClientRect){
        clientRect = element.getBoundingClientRect();

        // TODO add scroll position to bounds, so no scrolling of window necessary
        bounds.top = clientRect.top;
        bounds.bottom = clientRect.bottom || (clientRect.top + clientRect.height);
        bounds.left = clientRect.left;

        bounds.width = element.offsetWidth;
        bounds.height = element.offsetHeight;
      }

      return bounds;
    };

    if (options.elements.length === 1) {
      if (typeof options.elements[0] === "object" && options.elements[0].nodeName !== "BODY") {
        // crop image to the bounds of selected (single) element
        var bounds = Bounds(options.elements[0]);
        var newCanvas = document.createElement('canvas');
        newCanvas.width = Math.ceil(bounds.width);
        newCanvas.height = Math.ceil(bounds.height);
        ctx = newCanvas.getContext("2d");

        ctx.drawImage(canvas, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
        canvas = null;
        return newCanvas;
      }
    }

    console.log("Drew", count, "times");
    return canvas;
  };
};