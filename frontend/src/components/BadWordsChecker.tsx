//catches offensive and dirty words. sorry you have to see this.
//this is more a proof of concept for the project.
//honestly i don't recommend adding anything heinous to this list
//it's kinda inevitable for social media sites that someone's gonna try to say them

const badWords = ['fuck', 'shit', 'bitch', 'penis', 'vagina'];

const createBadWordRegex = (badWords : string[]) => {
    /* quick rundown on what this is doing:
    the function returns a map of all the bad words and their possible character replacements,
    to be used to compare to the input string
    ie. it will catch 'shit', 'sh!t', and 'sh1t'*/
    
    return badWords.map(word => {
        const regexPattern = word
            .replace(/a/g, '[a@]')
            .replace(/e/g, '[e3]')
            .replace(/i/g, '[i!1]')
            .replace(/o/g, '[o0]')
            .replace(/s/g, '[s5]')
            .replace(/b/g, '[b6]');

        return new RegExp(regexPattern, 'i'); //'i' makes case-insensitive matching
    });
};

const badWordCheck = (input : string) => {
    const regexList = createBadWordRegex(badWords);
    return regexList.some(regex => regex.test(input)); //checks if any entries match
};


export default badWordCheck;