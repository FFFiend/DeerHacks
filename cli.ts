// Command line interface for our program.
const args = Deno.args
// this is the array that takes in the two file paths as input 

if (args.length ==0){
    // cool, not too hard to follow 
    console.log("Type ./run followed by the two individual file paths of the files you have your text written in, and the file you want your Latex to be written to);
}
                
else if (args.length == 1){

    // now we take args[0] and read it, and store the raw file into a string variable 
    const text = await Deno.readTextFile(args[0]);
    // text now has the whole file stored in string form
    
    
}
else if (args.length == 2){
    const getter = await Deno.readTextFile(args[0]);
    // still wiating on this cuz of the tokenization and parsing stuff
    // await Deno.writeTextFile(arg[1], arg[0]);
    

    
}
else{
    // my cute attempt at exception handling. 
    console.log("You seem to misunderstand, just specify two file paths, one with your text and the other to copy the new Latex code into!")
}
