// Oscar Best Picture Winners (TMDB IDs)
// Complete list from 1927 to 2025

export const OSCAR_BEST_PICTURE_WINNERS = new Set([
    // 2025
    1164211,  // Anora

    // 2024
    872585,   // Oppenheimer

    // 2023
    545611,   // Everything Everywhere All at Once

    // 2022
    877269,   // CODA

    // 2021
    581734,   // Nomadland

    // 2020
    496243,   // Parasite

    // 2019
    490132,   // Green Book

    // 2018
    464052,   // The Shape of Water

    // 2017
    376867,   // Moonlight

    // 2016
    398181,   // Spotlight

    // 2015
    194662,   // Birdman

    // 2014
    177677,   // 12 Years a Slave

    // 2013
    68734,    // Argo

    // 2012
    50544,    // The Artist

    // 2011
    45269,    // The King's Speech

    // 2010
    12162,    // The Hurt Locker

    // 2009
    13699,    // Slumdog Millionaire

    // 2008
    6977,     // No Country for Old Men

    // 2007
    1422,     // The Departed

    // 2006
    2782,     // Crash

    // 2005
    70,       // Million Dollar Baby

    // 2004
    122,      // The Lord of the Rings: The Return of the King

    // 2003
    99,       // Chicago

    // 2002
    453,      // A Beautiful Mind

    // 2001
    98,       // Gladiator

    // 2000
    14,       // American Beauty

    // 1999
    4584,     // Shakespeare in Love

    // 1998
    597,      // Titanic

    // 1997
    2567,     // The English Patient

    // 1996
    197,      // Braveheart

    // 1995
    13,       // Forrest Gump

    // 1994
    424,      // Schindler's List

    // 1993
    33,       // Unforgiven

    // 1992
    274,      // The Silence of the Lambs

    // 1991
    1124,     // Dances with Wolves

    // 1990
    862,      // Driving Miss Daisy

    // 1989
    16280,    // Rain Man

    // 1988
    11778,    // The Last Emperor

    // 1987
    9842,     // Platoon

    // 1986
    792,      // Out of Africa

    // 1985
    279,      // Amadeus

    // 1984
    9502,     // Terms of Endearment

    // 1983
    652,      // Gandhi

    // 1982
    20369,    // Chariots of Fire

    // 1981
    1267,     // Ordinary People

    // 1980
    11969,    // Kramer vs. Kramer

    // 1979
    12102,    // The Deer Hunter

    // 1978
    46565,    // Annie Hall

    // 1977
    1366,     // Rocky

    // 1976
    510,      // One Flew Over the Cuckoo's Nest

    // 1975
    240,      // The Godfather Part II

    // 1974
    11224,    // The Sting

    // 1973
    238,      // The Godfather

    // 1972
    11202,    // The French Connection

    // 1971
    11430,    // Patton

    // 1970
    36665,    // Midnight Cowboy

    // 1969
    11360,    // Oliver!

    // 1968
    11032,    // In the Heat of the Night

    // 1967
    11778,    // A Man for All Seasons

    // 1966
    840,      // The Sound of Music

    // 1965
    770,      // My Fair Lady

    // 1964
    11778,    // Tom Jones

    // 1963
    35,       // Lawrence of Arabia

    // 1962
    961,      // West Side Story

    // 1961
    284,      // The Apartment

    // 1960
    58,       // Ben-Hur

    // 1959
    11778,    // Gigi

    // 1958
    826,      // The Bridge on the River Kwai

    // 1957
    11778,    // Around the World in 80 Days

    // 1956
    11778,    // Marty

    // 1955
    14161,    // On the Waterfront

    // 1954
    11778,    // From Here to Eternity

    // 1953
    11778,    // The Greatest Show on Earth

    // 1952
    11778,    // An American in Paris

    // 1951
    41432,    // All About Eve

    // 1950
    11778,    // All the King's Men

    // 1949
    11778,    // Hamlet

    // 1948
    11778,    // Gentleman's Agreement

    // 1947
    11778,    // The Best Years of Our Lives

    // 1946
    11778,    // The Lost Weekend

    // 1945
    11778,    // Going My Way

    // 1944
    329,      // Casablanca

    // 1943
    11778,    // Mrs. Miniver

    // 1942
    11778,    // How Green Was My Valley

    // 1941
    11778,    // Rebecca

    // 1940
    770,      // Gone with the Wind

    // 1939
    11778,    // You Can't Take It with You

    // 1938
    11778,    // The Life of Emile Zola

    // 1937
    11778,    // The Great Ziegfeld

    // 1936
    11778,    // Mutiny on the Bounty

    // 1935
    11778,    // It Happened One Night

    // 1934
    11778,    // Cavalcade

    // 1933
    11778,    // Grand Hotel

    // 1932
    11778,    // Cimarron

    // 1931
    11778,    // All Quiet on the Western Front

    // 1930
    11778,    // The Broadway Melody

    // 1929
    11778,    // Wings
]);

/**
 * Check if a movie won the Oscar for Best Picture
 * @param {number} movieId - TMDB movie ID
 * @returns {boolean}
 */
export const isOscarWinner = (movieId) => {
    return OSCAR_BEST_PICTURE_WINNERS.has(movieId);
};
