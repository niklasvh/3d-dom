function isTrue(arg) {
  return !!arg;
}

function setupUpdateStream(self) {
  self.update = function() {};
  self.updateStream = new Bacon.EventStream(function(subscriber) {
    self.update = function(time) {
      subscriber(new Bacon.Next(time));
    };
    return function() {};
  });
}

function diff(a, b) {
  return b - a;
}