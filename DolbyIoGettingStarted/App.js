import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    useColorScheme,
    View,
    Button,
    TextInput,
    Platform,
    PermissionsAndroid,
} from 'react-native';

import {
    Colors,
} from 'react-native/Libraries/NewAppScreen';

import CommsAPI, { VideoView } from '@dolbyio/comms-sdk-react-native';


const Section = ({children, title}) => {
    const isDarkMode = useColorScheme() === 'dark';
    return (
        <View style={styles.sectionContainer}>
          <Text
              style={[
                  styles.sectionTitle,
                  {
                      color: isDarkMode ? Colors.white : Colors.black,
                  },
              ]}>
              {title}
          </Text>
          <Text
              style={[
                  styles.sectionDescription,
                  {
                      color: isDarkMode ? Colors.light : Colors.dark,
                  },
              ]}>
              {children}
          </Text>
        </View>
    );
};

const App = () => {
    const [conferenceAlias, setConferenceAlias] = useState("react-native");
    const [streamingUsers, setStreamingUsers] = useState([]);

    const joinConference = async () => {
        try {
            const conferenceOptions = {
                alias: conferenceAlias,
                params: {},
            };
    
            // Create the conference
            const conference = await CommsAPI.conference.create(conferenceOptions);
            console.log(`Conference ${conference.id} created`);
    
            const joinOptions = {
                constraints: {
                    audio: true,
                    video: true,
                }
            };
    
            // Join the conference with Audio and Video on
            await CommsAPI.conference.join(conference, joinOptions);
            console.log('Conference joined');
        } catch (error) {
            console.error(error);
        }
    };

    const isDarkMode = useColorScheme() === 'dark';

    const backgroundStyle = {
        backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    };

    const requestPermissions = async () => {
        try {
            const cameraGranted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CAMERA,
                {
                    title: "Camera Permission",
                    message:"This App needs access to your camera",
                    buttonNeutral: "Ask Me Later",
                    buttonNegative: "Cancel",
                    buttonPositive: "OK"
                }
            );
    
            if (cameraGranted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log("You can use the camera");
            } else {
                console.log("Camera permission denied");
            }
    
            const micGranted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                {
                    title: "Microphone Permission",
                    message: "This App needs access to your microphone so you can talk to people.",
                    buttonNeutral: "Ask Me Later",
                    buttonNegative: "Cancel",
                    buttonPositive: "OK"
                }
            );
    
            if (micGranted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log("You can use the microphone");
            } else {
                console.log("Camera permission denied");
            }
        } catch (error) {
            console.warn(error);
        }
    };
  
    useEffect(() => {
        async function initialize() {
            if (Platform.OS === 'android') {
                // Request the permissions to access the camera and the microphone
                // required for Android only
                await requestPermissions();
            }

            // Initialize the SDK
            // Please read the documentation at:
            // https://docs.dolby.io/communications-apis/docs/initializing-javascript
            // Generate a test client access token from the Dolby.io dashboard and insert into access_token variable
            let access_token = 'TestClientAccessToken';
            await CommsAPI.initializeToken(access_token, () => {
              return new Promise((resolve, reject) => {
                resolve(access_token);
              });
            });

            const rand = Math.round(Math.random() * 10000);
            await CommsAPI.session.open({ name: `user-${rand}` });
        }
    
        initialize();
    }, []);

    useEffect(() => {
        const unsubscribe = CommsAPI.conference.onStreamsChange((data, type) => {
            if (type === 'EVENT_CONFERENCE_STREAM_REMOVED') {
                // Remove the users without a video stream
                setStreamingUsers(usr => usr.filter(d => d.participant.id !== data.participant.id));
                return;
            }
    
            if (
                !streamingUsers
                .map(d => d.participant.id)
                .includes(data.participant.id) &&
                data?.stream?.videoTracks?.length > 0
            ) {
                setStreamingUsers(sp => [...sp, data]);
            }
        });
    
        return () => unsubscribe();
    }, []);

    return (
        <SafeAreaView style={backgroundStyle}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                style={backgroundStyle}>
                <View
                    style={{
                        backgroundColor: isDarkMode ? Colors.black : Colors.white,
                    }}>
                    <Section title="Conference">
                        <Text>Alias:</Text>
                        <TextInput
                            style={styles.textInput}
                            onChangeText={setConferenceAlias}
                            value={conferenceAlias} />
                        <Button onPress={joinConference} title="Join the conference" />
                    </Section>

                    <Section title="Videos" style={{backgroundColor: 'black'}}>
                        {streamingUsers.map(({ participant, stream }) => (
                            <VideoView
                                key={`video-${participant.id}`}
                                style={{height: 200, width: 180, borderWidth: 1}}
                                ref={async element => {
                                    try {
                                        await element.attach(participant, stream);
                                    } catch (error) {
                                        console.error(error);
                                    }
                                }}
                            />
                        ))}
                    </Section>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        marginTop: 32,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '600',
    },
    sectionDescription: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: '400',
    },
    textInput: {
        height: Platform.OS == 'android' ? 40 : 20,
        margin: 12,
        borderWidth: 1,
        padding: 10,
        lineHeight: 14,
    },
});

export default App;