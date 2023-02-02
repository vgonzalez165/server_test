document.getElementById("form").addEventListener("submit", function(event) {
    event.preventDefault();
    var fileInput = document.getElementById("fileInput");
    var file = fileInput.files[0];
  
    var reader = new FileReader();
    reader.onload = function() {
      // the contents of the file are in reader.result
      var contents = reader.result;
      // do something with the contents...
    };
    reader.readAsText(file);
  });
  